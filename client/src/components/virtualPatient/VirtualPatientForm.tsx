import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { bodyPartEnum } from "@shared/schema";

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const bodyPartOptions = [
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

// Form schema based on the InsertVirtualPatient type
const formSchema = z.object({
  name: z.string().min(2, { message: "Patient name must be at least 2 characters." }),
  age: z.coerce.number().min(1, { message: "Age is required." }),
  gender: z.string().min(1, { message: "Gender is required." }),
  chiefComplaint: z.string().min(5, { message: "Chief complaint must be at least 5 characters." }),
  symptoms: z.string().min(20, { message: "Please provide a detailed symptoms description." }),
  bodyPart: z.enum(bodyPartEnum.enumValues, {
    required_error: "Body part is required.",
    invalid_type_error: "Body part must be valid."
  }),
  medicalHistory: z.string().optional(),
  assessment: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface VirtualPatientFormProps {
  onPatientCreated: (patientId: number) => void;
  onCancel: () => void;
  existingPatient?: any; // For editing mode
}

export default function VirtualPatientForm({ onPatientCreated, onCancel, existingPatient }: VirtualPatientFormProps) {
  const { toast } = useToast();
  const isEditMode = !!existingPatient;
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: existingPatient ? {
      name: existingPatient.name || "",
      age: existingPatient.age || 30,
      gender: existingPatient.gender || "",
      chiefComplaint: existingPatient.chiefComplaint || "",
      symptoms: existingPatient.symptoms || "",
      bodyPart: existingPatient.bodyPart || "other",
      medicalHistory: existingPatient.medicalHistory || "",
      assessment: existingPatient.assessment || "",
    } : {
      name: "",
      age: 30,
      gender: "",
      chiefComplaint: "",
      symptoms: "",
      bodyPart: "other",
      medicalHistory: "",
      assessment: "",
    },
  });

  const patientMutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log(isEditMode ? "Updating virtual patient data" : "Submitting virtual patient data");
      
      try {
        // Use fetch directly with credentials for better control
        const url = isEditMode 
          ? `/api/virtual-patients/${existingPatient.id}` 
          : "/api/virtual-patients";
        
        const method = isEditMode ? "PATCH" : "POST";
        
        // If we're editing and there's already a diagnosis, mark as edited
        const requestData = isEditMode && existingPatient?.diagnosis 
          ? { ...data, hasBeenEdited: true }
          : data;
        
        const response = await fetch(url, {
          method: method,
          body: JSON.stringify(requestData),
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include" // Important for sending cookies
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Virtual patient ${isEditMode ? "update" : "creation"} failed (${response.status}):`, errorText);
          throw new Error(errorText || `Error ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error(`Virtual patient ${isEditMode ? "update" : "creation"} error:`, error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Success response:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/virtual-patients"] });
      
      if (isEditMode) {
        queryClient.invalidateQueries({ queryKey: [`/api/virtual-patients/${existingPatient.id}`] });
      }
      
      toast({
        title: "Success",
        description: isEditMode 
          ? "Virtual patient updated successfully" 
          : "Virtual patient created successfully",
      });
      
      onPatientCreated(data.id);
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error",
        description: isEditMode 
          ? `Failed to update virtual patient: ${error.message}`
          : `Failed to create virtual patient: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: FormData) {
    patientMutation.mutate(data);
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age</FormLabel>
                    <FormControl>
                      <Input placeholder="42" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {genderOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name="bodyPart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Affected Body Part</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select body part" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bodyPartOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
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
              name="chiefComplaint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chief Complaint</FormLabel>
                  <FormControl>
                    <Input placeholder="Shoulder pain when lifting arm" {...field} />
                  </FormControl>
                  <FormDescription>
                    Brief description of the main problem
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="symptoms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detailed Symptoms Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe all symptoms, their intensity, duration, aggravating factors, etc."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide a detailed description of all symptoms and when they occur
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="medicalHistory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medical History</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Hypertension, diabetes, prior injuries, surgeries, medications, allergies, etc."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                
              <FormField
                control={form.control}
                name="assessment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assessment Details</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Initial assessment information, examination findings, test results, etc."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={patientMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={patientMutation.isPending}
              >
                {patientMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  isEditMode ? "Update Virtual Patient" : "Create Virtual Patient"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}