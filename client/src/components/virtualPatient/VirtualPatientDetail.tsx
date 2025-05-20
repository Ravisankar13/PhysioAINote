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
} from "lucide-react";
import PatientProgressTracker from "./PatientProgressTracker";
import BodyPartZoom from "./BodyPartZoom";
import { getPlaceholderImage, placeholderImages } from "./bodyPartImages";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";
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
      const response = await fetch(`/api/virtual-patients/${patientId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch patient details");
      }
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
    },
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
            <CardTitle>{patient.name}</CardTitle>
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
          <TabsList className="grid w-full grid-cols-7">
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
                  {patient.symptoms}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {patient.medicalHistory && (
                  <div>
                    <h3 className="text-md font-semibold mb-1">
                      Medical History
                    </h3>
                    <p className="text-sm leading-relaxed">
                      {patient.medicalHistory}
                    </p>
                  </div>
                )}

                {patient.assessment && (
                  <div>
                    <h3 className="text-md font-semibold mb-1">
                      Assessment Information
                    </h3>
                    <p className="text-sm leading-relaxed">
                      {patient.assessment}
                    </p>
                  </div>
                )}
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
                    <p className="text-sm text-muted-foreground italic">
                      No objective findings recorded. Click "Add Finding" to add
                      observations.
                    </p>
                  )}
                </div>
              </div>

              {/* Always show the analyze button */}
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
                      {hasDiagnosis
                        ? "Reanalyze Patient Data"
                        : "Analyze Patient Data"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* DIAGNOSIS TAB */}
          <TabsContent value="diagnosis" className="p-6">
            {!hasDiagnosis ? (
              renderEmptyState(
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />,
                "No diagnosis available",
                "Analyze the patient data to generate a diagnosis and treatment recommendations."
              )
            ) : (
              <div className="space-y-6">
                <div className="bg-primary/5 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <Brain className="h-5 w-5 mr-2 text-primary" />
                    Primary Diagnosis
                  </h3>
                  <h4 className="text-md font-medium mb-1">
                    {patient.diagnosis}
                  </h4>
                  {patient.differentialDiagnosis &&
                    patient.differentialDiagnosis[0]?.description && (
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
                    {patient.differentialDiagnosis &&
                      patient.differentialDiagnosis
                        .slice(1)
                        .map((diff: any, idx: number) => (
                          <div key={idx} className="border rounded-lg p-3">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="text-md font-medium">
                                {diff.name}
                              </h4>
                              <Badge
                                variant={
                                  diff.likelihood === "high"
                                    ? "destructive"
                                    : diff.likelihood === "medium"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {diff.likelihood} likelihood
                              </Badge>
                            </div>
                            <p className="text-sm">{diff.reasoning}</p>
                          </div>
                        ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ASSESSMENT TESTS TAB - Enhanced with clinical tests */}
          <TabsContent value="assessment" className="p-6">
            {!hasDiagnosis ? (
              renderEmptyState(
                <Clipboard className="h-12 w-12 text-gray-400 mx-auto mb-4" />,
                "No assessment data available",
                "Analyze the patient data to view relevant assessment tests."
              )
            ) : (
              <div className="space-y-6">
                <div className="bg-primary/5 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <Clipboard className="h-5 w-5 mr-2 text-primary" />
                    Relevant Clinical Tests
                  </h3>
                  <p className="text-sm mb-4">
                    These diagnostic tests are recommended to confirm the
                    primary diagnosis.
                  </p>
                </div>

                {Array.isArray(patient.assessmentTests) &&
                patient.assessmentTests.length > 0 ? (
                  <div className="space-y-4">
                    {patient.assessmentTests.map((test: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-md font-semibold">
                            {test.name || "Unnamed Test"}
                          </h4>
                          <Badge
                            variant={
                              test.relevance === "primary"
                                ? "default"
                                : test.relevance === "secondary"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {test.relevance === "primary"
                              ? "Primary"
                              : test.relevance === "secondary"
                              ? "Secondary"
                              : "Supportive"}{" "}
                            Test
                          </Badge>
                        </div>
                        <p className="text-sm mb-2">
                          {test.purpose ||
                            test.description ||
                            "No description provided"}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          <div>
                            <h5 className="text-sm font-medium mb-1">
                              How to Perform
                            </h5>
                            <p className="text-sm">
                              {test.procedure ||
                                "No procedure details available"}
                            </p>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium mb-1">
                              Positive Findings
                            </h5>
                            <p className="text-sm">
                              {test.positiveFindings ||
                                "No details on positive findings"}
                            </p>
                          </div>
                        </div>
                        {test.supportingResearch && (
                          <div className="mt-3">
                            <h5 className="text-sm font-medium">
                              Research Support
                            </h5>
                            <p className="text-sm">{test.supportingResearch}</p>
                          </div>
                        )}
                        {test.sensitivity && (
                          <div className="flex space-x-2 mt-2">
                            <Badge variant="outline">
                              Sensitivity: {test.sensitivity}
                            </Badge>
                            {test.specificity && (
                              <Badge variant="outline">
                                Specificity: {test.specificity}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-muted/20 rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      No assessment tests available for this patient. Try
                      reanalyzing the patient data.
                    </p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* OBJECTIVE FINDINGS TAB */}
          <TabsContent value="findings" className="p-6">
            {!hasDiagnosis ? (
              renderEmptyState(
                <ClipboardCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />,
                "No objective findings available",
                "Analyze the patient data to view objective findings."
              )
            ) : (
              <div className="space-y-6">
                {patient.objectiveFindings &&
                  patient.objectiveFindings.map((finding: any, idx: number) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <h4 className="text-md font-semibold mb-3 bg-primary/10 p-2 rounded">
                        {finding.category}
                      </h4>
                      {finding.observations &&
                        finding.observations.map(
                          (observation: any, obsIdx: number) => (
                            <div key={obsIdx} className="mb-4">
                              <h5 className="text-sm font-medium mb-1">
                                {observation.title}
                              </h5>
                              <p className="text-sm mb-2">
                                {observation.details}
                              </p>

                              {observation.measurements && (
                                <div className="grid grid-cols-2 gap-2 text-sm ml-3 mt-2">
                                  {Object.entries(observation.measurements).map(
                                    (
                                      [key, value]: [string, any],
                                      i: number
                                    ) => (
                                      <div
                                        key={i}
                                        className="flex justify-between"
                                      >
                                        <span className="font-medium">
                                          {key}:
                                        </span>
                                        <span>{value}</span>
                                      </div>
                                    )
                                  )}
                                </div>
                              )}

                              {observation.notes && (
                                <p className="text-sm italic mt-2">
                                  {observation.notes}
                                </p>
                              )}
                            </div>
                          )
                        )}
                    </div>
                  ))}
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
                  <div className="space-y-6">
                    {patient.treatmentOptions &&
                      patient.treatmentOptions.map(
                        (treatmentCategory: any, idx: number) => (
                          <div key={idx} className="border rounded-lg p-4">
                            <h4 className="text-md font-semibold mb-3 bg-primary/10 p-2 rounded">
                              {treatmentCategory.category}
                            </h4>

                            {/* Manual Therapy Techniques */}
                            {treatmentCategory.techniques &&
                              treatmentCategory.techniques.length > 0 && (
                                <div className="mb-4 space-y-3">
                                  {treatmentCategory.techniques.map(
                                    (technique: any, techIdx: number) => (
                                      <div
                                        key={techIdx}
                                        className="border border-gray-200 rounded-md p-3"
                                      >
                                        <div className="flex justify-between items-start mb-2">
                                          <h5 className="text-md font-medium">
                                            {technique.name}
                                          </h5>
                                          <div className="flex space-x-2">
                                            <Badge variant="outline">
                                              {technique.evidenceLevel} evidence
                                            </Badge>
                                            <Badge
                                              variant={
                                                technique.recommendationStrength ===
                                                "highly recommended"
                                                  ? "default"
                                                  : technique.recommendationStrength ===
                                                    "recommended"
                                                  ? "secondary"
                                                  : "outline"
                                              }
                                            >
                                              {technique.recommendationStrength}
                                            </Badge>
                                          </div>
                                        </div>
                                        <p className="text-sm mb-2">
                                          <strong>Description:</strong>{" "}
                                          {technique.description}
                                        </p>
                                        <p className="text-sm mb-2">
                                          <strong>Target Tissue:</strong>{" "}
                                          {technique.targetTissue}
                                        </p>
                                        <p className="text-sm mb-2">
                                          <strong>Research Support:</strong>{" "}
                                          {technique.researchSupport}
                                        </p>
                                        {technique.contraindications &&
                                          technique.contraindications.length >
                                            0 && (
                                            <div className="mt-2">
                                              <p className="text-sm font-medium">
                                                Contraindications:
                                              </p>
                                              <ul className="list-disc list-inside text-sm ml-2">
                                                {technique.contraindications.map(
                                                  (
                                                    contraindication: string,
                                                    i: number
                                                  ) => (
                                                    <li key={i}>
                                                      {contraindication}
                                                    </li>
                                                  )
                                                )}
                                              </ul>
                                            </div>
                                          )}
                                      </div>
                                    )
                                  )}
                                </div>
                              )}

                            {/* Progressive Loading Exercises */}
                            {treatmentCategory.exercises &&
                              treatmentCategory.exercises.length > 0 && (
                                <div className="mb-4 space-y-3">
                                  {treatmentCategory.exercises.map(
                                    (exercise: any, exIdx: number) => (
                                      <div
                                        key={exIdx}
                                        className="border border-gray-200 rounded-md p-3"
                                      >
                                        <div className="flex justify-between items-start mb-2">
                                          <h5 className="text-md font-medium">
                                            {exercise.name}
                                          </h5>
                                          <div className="flex space-x-2">
                                            <Badge variant="outline">
                                              {exercise.evidenceLevel} evidence
                                            </Badge>
                                            <Badge
                                              variant={
                                                exercise.recommendationStrength ===
                                                "highly recommended"
                                                  ? "default"
                                                  : exercise.recommendationStrength ===
                                                    "recommended"
                                                  ? "secondary"
                                                  : "outline"
                                              }
                                            >
                                              {exercise.recommendationStrength}
                                            </Badge>
                                          </div>
                                        </div>
                                        <p className="text-sm mb-2">
                                          <strong>Description:</strong>{" "}
                                          {exercise.description}
                                        </p>
                                        <p className="text-sm mb-2">
                                          <strong>Target Muscle Group:</strong>{" "}
                                          {exercise.targetMuscleGroup}
                                        </p>

                                        <div className="bg-gray-50 p-2 rounded my-2">
                                          <p className="text-sm font-medium mb-1">
                                            Loading Parameters:
                                          </p>
                                          <div className="grid grid-cols-2 gap-2 text-sm">
                                            <p>
                                              <strong>Sets:</strong>{" "}
                                              {exercise.loadingParameters.sets}
                                            </p>
                                            <p>
                                              <strong>Reps:</strong>{" "}
                                              {exercise.loadingParameters.reps}
                                            </p>
                                            <p>
                                              <strong>Frequency:</strong>{" "}
                                              {
                                                exercise.loadingParameters
                                                  .frequency
                                              }
                                            </p>
                                            <p>
                                              <strong>Intensity:</strong>{" "}
                                              {
                                                exercise.loadingParameters
                                                  .intensity
                                              }
                                            </p>
                                          </div>
                                          <p className="text-sm mt-1">
                                            <strong>
                                              Progression Criteria:
                                            </strong>{" "}
                                            {
                                              exercise.loadingParameters
                                                .progressionCriteria
                                            }
                                          </p>
                                        </div>

                                        <p className="text-sm mb-2">
                                          <strong>Research Support:</strong>{" "}
                                          {exercise.researchSupport}
                                        </p>

                                        {exercise.modificationOptions &&
                                          exercise.modificationOptions.length >
                                            0 && (
                                            <div className="mt-2">
                                              <p className="text-sm font-medium">
                                                Modification Options:
                                              </p>
                                              <ul className="list-disc list-inside text-sm ml-2">
                                                {exercise.modificationOptions.map(
                                                  (
                                                    modification: string,
                                                    i: number
                                                  ) => (
                                                    <li key={i}>
                                                      {modification}
                                                    </li>
                                                  )
                                                )}
                                              </ul>
                                            </div>
                                          )}
                                      </div>
                                    )
                                  )}
                                </div>
                              )}

                            {/* Patient Education */}
                            {treatmentCategory.recommendations &&
                              treatmentCategory.recommendations.length > 0 && (
                                <div className="space-y-3">
                                  {treatmentCategory.recommendations.map(
                                    (rec: any, eduIdx: number) => (
                                      <div
                                        key={eduIdx}
                                        className="border border-gray-200 rounded-md p-3"
                                      >
                                        <div className="flex justify-between items-start mb-2">
                                          <h5 className="text-md font-medium">
                                            {rec.topic}
                                          </h5>
                                          <Badge
                                            variant={
                                              rec.importance === "high"
                                                ? "default"
                                                : rec.importance === "medium"
                                                ? "secondary"
                                                : "outline"
                                            }
                                          >
                                            {rec.importance} importance
                                          </Badge>
                                        </div>
                                        <p className="text-sm mb-2">
                                          {rec.details}
                                        </p>
                                        {rec.resources &&
                                          rec.resources.length > 0 && (
                                            <div className="mt-2">
                                              <p className="text-sm font-medium">
                                                Resources:
                                              </p>
                                              <ul className="list-disc list-inside text-sm ml-2">
                                                {rec.resources.map(
                                                  (
                                                    resource: string,
                                                    i: number
                                                  ) => (
                                                    <li key={i}>{resource}</li>
                                                  )
                                                )}
                                              </ul>
                                            </div>
                                          )}
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                          </div>
                        )
                      )}
                  </div>
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
                patientId={patient.id}
                bodyPart={patient.bodyPart || "general"}
              />
            )}
          </TabsContent>

          {/* INTERACTIVE ANATOMY TAB */}
          <TabsContent value="anatomy" className="p-6">
            <BodyPartZoom
              bodyPart={patient.bodyPart || "general"}
              imageUrl={
                placeholderImages[patient.bodyPart?.toLowerCase() || "general"]
              }
            />
            {/* Add fallback message in case image doesn't load */}
            <div className="text-xs text-center text-muted-foreground mt-2">
              Note: Interactive model displays anatomy regions for{" "}
              {patient.bodyPart || "general"} body part. Click on highlighted
              points to explore techniques.
            </div>
          </TabsContent>

          {/* RESEARCH TAB */}
          <TabsContent value="research" className="p-6">
            {!hasDiagnosis ? (
              renderEmptyState(
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />,
                "No research available",
                "Analyze the patient data to view relevant research."
              )
            ) : (
              <div className="space-y-6">
                <div className="bg-primary/5 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <BookOpen className="h-5 w-5 mr-2 text-primary" />
                    Related Research
                  </h3>
                  <p className="text-sm">
                    Evidence-based research relevant to this case.
                  </p>
                </div>

                {console.log("Related research data:", patient.relatedResearch)}
                {Array.isArray(patient.relatedResearch) &&
                patient.relatedResearch.length > 0 ? (
                  patient.relatedResearch.map((research: any, idx: number) => (
                    <div key={idx} className="border rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-start">
                        <h4 className="text-md font-medium mb-1">
                          {research.title}
                        </h4>
                        <Badge variant="outline">
                          {research.publicationYear || research.year || "N/A"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        {Array.isArray(research.authors)
                          ? research.authors.join(", ")
                          : research.author}
                      </p>
                      <p className="text-sm mb-3">{research.abstract}</p>

                      <div className="flex flex-wrap gap-2 mb-2">
                        {Array.isArray(research.keywords) &&
                          research.keywords.map(
                            (keyword: string, kidx: number) => (
                              <Badge
                                key={kidx}
                                variant="secondary"
                                className="text-xs"
                              >
                                {keyword}
                              </Badge>
                            )
                          )}
                      </div>

                      <div className="text-sm">
                        <p>
                          <strong>Journal:</strong>{" "}
                          {research.journal || "Not specified"}
                        </p>
                        {research.doi && (
                          <p>
                            <strong>DOI:</strong> {research.doi}
                          </p>
                        )}
                      </div>

                      {research.keyFindings && (
                        <div className="mt-3">
                          <h5 className="text-sm font-medium mb-1">
                            Key Findings
                          </h5>
                          <ul className="list-disc list-inside text-sm ml-2">
                            {Array.isArray(research.keyFindings) ? (
                              research.keyFindings.map(
                                (finding: string, fidx: number) => (
                                  <li key={fidx}>{finding}</li>
                                )
                              )
                            ) : (
                              <li>{String(research.keyFindings)}</li>
                            )}
                          </ul>
                        </div>
                      )}

                      {research.clinicalImplications && (
                        <div className="mt-3">
                          <h5 className="text-sm font-medium mb-1">
                            Clinical Implications
                          </h5>
                          <p className="text-sm">
                            {research.clinicalImplications}
                          </p>
                        </div>
                      )}

                      {research.link && (
                        <div className="mt-3">
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto"
                            asChild
                          >
                            <Link to={research.link} target="_blank">
                              View full article
                            </Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      No related research articles available for this patient.
                    </p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
