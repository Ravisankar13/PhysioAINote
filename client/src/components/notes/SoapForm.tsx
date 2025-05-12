import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { generateSoapNote } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

import SimpleRecorder from "@/components/notes/SimpleRecorder";
import { soapNoteInputSchema } from "@shared/schema";

interface SoapFormProps {
  onNoteGenerated: (noteData: any) => void;
}

const SoapForm = ({ onNoteGenerated }: SoapFormProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Get today's date in YYYY-MM-DD format for default values
  const today = new Date().toISOString().split("T")[0];
  
  // Initialize the form with the schema
  const form = useForm<z.infer<typeof soapNoteInputSchema>>({
    resolver: zodResolver(soapNoteInputSchema),
    defaultValues: {
      patientName: "",
      patientId: "",
      dateOfBirth: "",
      dateOfVisit: today,
      subjective: "",
      objective: "",
      assessment: "",
      plan: "",
    },
  });

  const generateNoteMutation = useMutation({
    mutationFn: generateSoapNote,
    onSuccess: (data) => {
      setIsLoading(false);
      onNoteGenerated(data);
      toast({
        title: "SOAP Note Generated",
        description: "Your clinical note has been successfully generated.",
      });
    },
    onError: (error) => {
      setIsLoading(false);
      console.error("Error generating note:", error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate the SOAP note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: z.infer<typeof soapNoteInputSchema>) => {
    setIsLoading(true);
    generateNoteMutation.mutate(data);
  };

  const handleReset = () => {
    form.reset({
      patientName: "",
      patientId: "",
      dateOfBirth: "",
      dateOfVisit: today,
      subjective: "",
      objective: "",
      assessment: "",
      plan: "",
    });
  };
  
  // Import the TranscriptionResult type from VoiceRecorder
  type TranscriptionResult = {
    transcript?: string;
    transcription?: string;
    clinicalInsights?: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  
  const handleRecordingComplete = (_audioBlob: Blob, transcriptData: TranscriptionResult | string) => {
    // Update form with data from the transcription analysis
    const { subjective } = form.getValues();
    
    // Check if we have an object with proper data
    if (typeof transcriptData === 'object') {
      const data = transcriptData as TranscriptionResult;
      
      // Handle clinical insights (new format)
      if (data.clinicalInsights) {
        form.setValue("subjective", subjective 
          ? `${subjective}\n\n### Clinical Analysis:\n${data.clinicalInsights}` 
          : `### Clinical Analysis:\n${data.clinicalInsights}`);
      }
      // Handle transcription (new format) or transcript (old format)
      else if (data.transcription || data.transcript) {
        const transcript = data.transcription || data.transcript || '';
        form.setValue("subjective", subjective 
          ? `${subjective}\n\n### Voice Recording Transcript:\n${transcript}` 
          : `### Voice Recording Transcript:\n${transcript}`);
      }
      // Handle SOAP format (old format) if clinicalInsights not available
      else if (data.subjective) {
        form.setValue("subjective", subjective 
          ? `${subjective}\n\n${data.subjective}` 
          : data.subjective);
          
        if (data.objective) {
          const { objective } = form.getValues();
          form.setValue("objective", objective 
            ? `${objective}\n\n${data.objective}` 
            : data.objective);
        }
        
        if (data.assessment) {
          const { assessment } = form.getValues();
          form.setValue("assessment", assessment 
            ? `${assessment}\n\n${data.assessment}` 
            : data.assessment);
        }
        
        if (data.plan) {
          const { plan } = form.getValues();
          form.setValue("plan", plan 
            ? `${plan}\n\n${data.plan}` 
            : data.plan);
        }
      } 
      // Fallback for no recognizable data
      else {
        form.setValue("subjective", subjective 
          ? `${subjective}\n\n### Note: No structured data was extracted from the recording.` 
          : `### Note: No structured data was extracted from the recording.`);
      }
    } 
    // Handle string data (usually error messages)
    else if (typeof transcriptData === 'string') {
      form.setValue("subjective", subjective 
        ? `${subjective}\n\n### Recording Note:\n${transcriptData}` 
        : `### Recording Note:\n${transcriptData}`);
    }
    
    toast({
      title: "Recording Processed",
      description: "Voice recording has been transcribed and analyzed.",
    });
  };

  return (
    <Card className="bg-white">
      <CardContent className="p-6 sm:p-10">
        <div className="space-y-6">
          <div className="pb-5 border-b border-neutral-200">
            <h3 className="text-lg leading-6 font-medium text-neutral-900">Patient Information</h3>
            <p className="mt-2 max-w-4xl text-sm text-neutral-500">
              Enter patient details and clinical information to generate comprehensive clinical notes. Use the voice recording 
              feature to automatically transcribe and analyze your clinical sessions.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 divide-y divide-neutral-200">
              <div className="space-y-6 sm:space-y-5">
                {/* Patient Info Section */}
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <FormField
                    control={form.control}
                    name="patientName"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-3">
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
                    name="patientId"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-3">
                        <FormLabel>Patient ID</FormLabel>
                        <FormControl>
                          <Input placeholder="PT12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-3">
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateOfVisit"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-3">
                        <FormLabel>Date of Visit</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* SOAP Inputs */}
                <div className="pt-6">
                  <h4 className="text-lg font-medium text-neutral-900">SOAP Note Details</h4>
                  <p className="text-sm text-neutral-500 mt-1">
                    Record your voice notes below to automatically generate SOAP note content
                  </p>
                </div>

                {/* Voice Recording Section */}
                <div className="mb-6 w-full">
                  <div className="mb-4 p-5 bg-red-50 border border-red-100 rounded-lg shadow-sm">
                    <h4 className="text-red-800 font-medium mb-2">Record Your Clinical Notes</h4>
                    <p className="text-sm text-neutral-700">
                      Use the red microphone button below to record your clinical session. Our AI will:
                    </p>
                    <ul className="text-sm text-neutral-700 list-disc pl-5 mt-2">
                      <li>Transcribe your voice recording</li>
                      <li>Extract key clinical information</li>
                      <li>Organize findings into a structured SOAP format</li>
                      <li>Generate comprehensive clinical documentation</li>
                    </ul>
                  </div>
                  <SimpleRecorder onRecordingComplete={handleRecordingComplete} />
                </div>

                <FormField
                  control={form.control}
                  name="subjective"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Subjective</FormLabel>
                      <FormDescription>
                        Patient's description of symptoms, pain levels, and concerns.
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="Patient reports..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="objective"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Objective</FormLabel>
                      <FormDescription>
                        Your observations, measurements, and test results.
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="ROM measurements..."
                          className="min-h-[100px]"
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
                    <FormItem className="space-y-2">
                      <FormLabel>Assessment</FormLabel>
                      <FormDescription>
                        Your clinical assessment and diagnosis.
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="Patient presents with..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="plan"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Plan</FormLabel>
                      <FormDescription>
                        Treatment plan, goals, and follow-up.
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="Treatment plan includes..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-5">
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={isLoading}
                  >
                    Reset Form
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Generating..." : "Generate SOAP Note"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
};

export default SoapForm;
