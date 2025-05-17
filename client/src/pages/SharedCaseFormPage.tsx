import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useNavigate, useParams } from "react-router-dom";

// Types
interface SharedCase {
  id: number;
  userId: number;
  title: string;
  description: string;
  bodyPart: string;
  patientAgeRange: string;
  patientGender: string;
  condition: string;
  presentingComplaints: string;
  clinicalHistory?: string;
  examinationFindings?: string;
  investigationResults?: string;
  initialDiagnosis?: string;
  treatmentApproach?: string;
  outcome?: string;
  learningPoints?: string;
  expertiseLevel: string;
  complexityLevel: string;
  keywords?: string[];
  isAnonymized: boolean;
  createdAt: string;
  updatedAt: string;
}

const BODY_PARTS = [
  { value: "shoulder", label: "Shoulder" },
  { value: "neck", label: "Neck" },
  { value: "back", label: "Back" },
  { value: "elbow", label: "Elbow" },
  { value: "wrist", label: "Wrist" },
  { value: "hand", label: "Hand" },
  { value: "hip", label: "Hip" },
  { value: "knee", label: "Knee" },
  { value: "ankle", label: "Ankle" },
  { value: "foot", label: "Foot" },
  { value: "general", label: "General" },
  { value: "other", label: "Other" },
];

const EXPERTISE_LEVELS = [
  { value: "student", label: "Student" },
  { value: "novice", label: "Novice" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
];

const COMPLEXITY_LEVELS = [
  { value: "simple", label: "Simple" },
  { value: "moderate", label: "Moderate" },
  { value: "complex", label: "Complex" },
  { value: "multifactorial", label: "Multifactorial" },
];

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "not-specified", label: "Not Specified" },
];

const AGE_RANGES = [
  { value: "0-12", label: "Child (0-12)" },
  { value: "13-17", label: "Adolescent (13-17)" },
  { value: "18-30", label: "Young Adult (18-30)" },
  { value: "31-45", label: "Adult (31-45)" },
  { value: "46-60", label: "Middle-aged (46-60)" },
  { value: "61-75", label: "Senior (61-75)" },
  { value: "76+", label: "Elderly (76+)" },
];

// Form schema
const caseSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title must be less than 100 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  bodyPart: z.string().min(1, "Please select a body part"),
  patientAgeRange: z.string().min(1, "Please select an age range"),
  patientGender: z.string().min(1, "Please select a gender"),
  condition: z.string().min(3, "Please provide the primary condition"),
  presentingComplaints: z
    .string()
    .min(20, "Please describe the presenting complaints"),
  clinicalHistory: z.string().optional(),
  examinationFindings: z.string().optional(),
  investigationResults: z.string().optional(),
  initialDiagnosis: z.string().optional(),
  treatmentApproach: z.string().optional(),
  outcome: z.string().optional(),
  learningPoints: z.string().optional(),
  expertiseLevel: z.string().min(1, "Please select an expertise level"),
  complexityLevel: z.string().min(1, "Please select a complexity level"),
  keywords: z.string().optional(),
  isAnonymized: z.boolean().default(true),
});

type CaseFormValues = z.infer<typeof caseSchema>;

export default function SharedCaseFormPage() {
  const { id } = useParams<{ id?: string }>();
  const caseId = id ? parseInt(id) : undefined;
  const isEditing = !!caseId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<CaseFormValues>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      title: "",
      description: "",
      bodyPart: "",
      patientAgeRange: "",
      patientGender: "",
      condition: "",
      presentingComplaints: "",
      clinicalHistory: "",
      examinationFindings: "",
      investigationResults: "",
      initialDiagnosis: "",
      treatmentApproach: "",
      outcome: "",
      learningPoints: "",
      expertiseLevel: "intermediate",
      complexityLevel: "moderate",
      keywords: "",
      isAnonymized: true,
    },
  });

  // Fetch case data if editing
  const { data: caseData, isLoading: isLoadingCase } = useQuery<SharedCase>({
    queryKey: ["/api/shared-cases", caseId],
    queryFn: () =>
      fetch(`/api/shared-cases/${caseId}`).then((res) => res.json()),
    enabled: !!isEditing,
    refetchOnWindowFocus: false,
  });

  // Set form values when case data is loaded
  useEffect(() => {
    if (caseData) {
      form.reset({
        title: caseData.title,
        description: caseData.description,
        bodyPart: caseData.bodyPart,
        patientAgeRange: caseData.patientAgeRange,
        patientGender: caseData.patientGender,
        condition: caseData.condition,
        presentingComplaints: caseData.presentingComplaints,
        clinicalHistory: caseData.clinicalHistory || "",
        examinationFindings: caseData.examinationFindings || "",
        investigationResults: caseData.investigationResults || "",
        initialDiagnosis: caseData.initialDiagnosis || "",
        treatmentApproach: caseData.treatmentApproach || "",
        outcome: caseData.outcome || "",
        learningPoints: caseData.learningPoints || "",
        expertiseLevel: caseData.expertiseLevel,
        complexityLevel: caseData.complexityLevel,
        keywords: caseData.keywords ? caseData.keywords.join(", ") : "",
        isAnonymized: caseData.isAnonymized,
      });
    }
  }, [caseData, form]);

  // Check ownership if editing
  const isOwner = user && caseData && user.id === caseData.userId;

  // Create and update mutations
  const createMutation = useMutation({
    mutationFn: async (data: CaseFormValues) => {
      // Process keywords if provided
      const processedData = {
        ...data,
        sourceType: "manual",
        keywords: data.keywords
          ? data.keywords
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean)
          : undefined,
      };

      const res = await apiRequest("POST", "/api/shared-cases", processedData);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Case shared successfully",
        description: "Your case has been shared with the community",
      });
      navigate(`/shared-cases/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error sharing case",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CaseFormValues) => {
      // Process keywords if provided
      const processedData = {
        ...data,
        keywords: data.keywords
          ? data.keywords
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean)
          : undefined,
      };

      const res = await apiRequest(
        "PUT",
        `/api/shared-cases/${caseId}`,
        processedData
      );
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Case updated successfully",
        description: "Your changes have been saved",
      });
      navigate(`/shared-cases/${data.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating case",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: CaseFormValues) => {
    if (isEditing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to share or edit cases",
        variant: "destructive",
      });
      navigate("/auth");
    }
  }, [user, navigate, toast]);

  // Redirect if editing a case that doesn't belong to the user
  useEffect(() => {
    if (isEditing && caseData && user && caseData.userId !== user.id) {
      toast({
        title: "Unauthorized",
        description: "You do not have permission to edit this case",
        variant: "destructive",
      });
      navigate("/shared-cases");
    }
  }, [isEditing, caseData, user, navigate, toast]);

  if (isEditing && isLoadingCase) {
    return (
      <div className="container py-12 flex justify-center items-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate("/shared-cases")}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Cases
      </Button>

      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Edit Case" : "Share a Case"}</CardTitle>
            <CardDescription>
              {isEditing
                ? "Update your shared clinical case with the community"
                : "Share your knowledge and experience with the physiotherapy community"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Basic Information</h3>

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="E.g., Rotator Cuff Tear in a 45-year-old Tennis Player"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          A concise title that summarizes the case
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bodyPart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Body Part</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select body part" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {BODY_PARTS.map((part) => (
                                <SelectItem key={part.value} value={part.value}>
                                  {part.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="condition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Condition/Diagnosis</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="E.g., Supraspinatus Tear, Low Back Pain"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="patientAgeRange"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient Age Range</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select age range" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {AGE_RANGES.map((range) => (
                                <SelectItem
                                  key={range.value}
                                  value={range.value}
                                >
                                  {range.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="patientGender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient Gender</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {GENDER_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Case Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Provide a brief overview of the case"
                            {...field}
                            rows={3}
                          />
                        </FormControl>
                        <FormDescription>
                          A short summary of the case (approximately 2-3
                          sentences)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="presentingComplaints"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Presenting Complaints</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the patient's presenting complaints, symptoms, and chief concerns"
                            {...field}
                            rows={4}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Case Details</h3>

                  <FormField
                    control={form.control}
                    name="clinicalHistory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Clinical History</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Relevant medical, surgical, and family history (optional)"
                            {...field}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="examinationFindings"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Examination Findings</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Physical examination and other relevant findings (optional)"
                            {...field}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="investigationResults"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Investigation Results</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Results of any investigations (e.g., imaging, lab tests) if applicable (optional)"
                            {...field}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="initialDiagnosis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initial Diagnosis</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Initial diagnosis and differential diagnoses considered (optional)"
                            {...field}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="treatmentApproach"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Treatment Approach</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your treatment approach and interventions (optional)"
                            {...field}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Outcomes and Learning</h3>

                  <FormField
                    control={form.control}
                    name="outcome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Outcome</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="What was the outcome of the treatment? How did the patient respond? (optional)"
                            {...field}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="learningPoints"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Learning Points</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Key learning points, reflections, or insights from this case (optional)"
                            {...field}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Case Classification</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="expertiseLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expertise Level</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select expertise level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {EXPERTISE_LEVELS.map((level) => (
                                <SelectItem
                                  key={level.value}
                                  value={level.value}
                                >
                                  {level.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Target audience for this case
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="complexityLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complexity Level</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select complexity level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {COMPLEXITY_LEVELS.map((level) => (
                                <SelectItem
                                  key={level.value}
                                  value={level.value}
                                >
                                  {level.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The overall complexity of the case
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="keywords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Keywords</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="E.g., sports injury, rehabilitation, tendinopathy (comma-separated)"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Add keywords to help others find your case
                          (comma-separated)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isAnonymized"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            This case contains no patient-identifying
                            information
                          </FormLabel>
                          <FormDescription>
                            By checking this box, you confirm that you have
                            removed all patient-identifying information and have
                            anonymized the case sufficiently
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/shared-cases")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isEditing ? "Update Case" : "Share Case"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
