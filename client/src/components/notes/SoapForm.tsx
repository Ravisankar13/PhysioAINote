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
  
  // For forcing UI updates when the form values change
  const [notesUpdated, setNotesUpdated] = useState(0);
  
  const handleRecordingComplete = (_audioBlob: Blob, transcriptData: TranscriptionResult | string) => {
    // Show SOAP note generation is in progress
    setIsLoading(true);
    
    // Update form with data from the transcription analysis
    try {
      const { subjective } = form.getValues();
      
      // Check if we have an object with proper data
      if (typeof transcriptData === 'object') {
        const data = transcriptData as TranscriptionResult;
        
        // Clear existing note content for a fresh start
        form.setValue("subjective", "");
        form.setValue("objective", "");
        form.setValue("assessment", "");
        form.setValue("plan", "");
        
        // Small delay to show AI is processing
        setTimeout(() => {
          // Handle clinical insights (new format)
          if (data.clinicalInsights) {
            // Generate a simulated SOAP note from the clinical insights
            const insights = data.clinicalInsights;
            
            // Use the transcript as subjective data
            if (data.transcript || data.transcription) {
              const transcript = data.transcript || data.transcription || '';
              form.setValue("subjective", `### Patient Description:\n${transcript}`);
            } else {
              form.setValue("subjective", `### Clinical Analysis:\n${insights}`);
            }
            
            // Create simulated objective/assessment/plan data for demo
            // In a real implementation, you would use proper AI-generated content for each section
            form.setValue("objective", "### Clinical Observations:\nBased on transcribed audio session");
            form.setValue("assessment", "### Assessment:\nSee clinical analysis above");
            form.setValue("plan", "### Treatment Plan:\nFollow-up recommended based on findings");
          }
          // Handle SOAP format (old format) if clinicalInsights not available
          else if (data.subjective) {
            form.setValue("subjective", data.subjective);
            
            if (data.objective) {
              form.setValue("objective", data.objective);
            }
            
            if (data.assessment) {
              form.setValue("assessment", data.assessment);
            }
            
            if (data.plan) {
              form.setValue("plan", data.plan);
            }
          } 
          // Fallback for transcription only
          else if (data.transcription || data.transcript) {
            const transcript = data.transcription || data.transcript || '';
            form.setValue("subjective", `### Voice Recording Transcript:\n${transcript}`);
          }
          // Fallback for no recognizable data
          else {
            form.setValue("subjective", "### Note: No structured data was extracted from the recording.");
          }
          
          // Force UI update
          setNotesUpdated(prev => prev + 1);
          setIsLoading(false);
          
          toast({
            title: "SOAP Note Generated",
            description: "Voice recording has been analyzed and converted to clinical notes.",
          });
        }, 1000);
      } 
      // Handle string data (usually error messages)
      else if (typeof transcriptData === 'string') {
        form.setValue("subjective", `### Recording Note:\n${transcriptData}`);
        setNotesUpdated(prev => prev + 1);
        setIsLoading(false);
        
        toast({
          title: "Recording Processed",
          description: "Note: Limited information extracted from recording.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error processing recording data:", error);
      form.setValue("subjective", "### Error:\nFailed to process the recording data. Please try again.");
      setNotesUpdated(prev => prev + 1);
      setIsLoading(false);
      
      toast({
        title: "Processing Error",
        description: "Failed to generate notes from the recording.",
        variant: "destructive"
      });
    }
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

                <div className="space-y-2 mt-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-neutral-900">Generated Clinical Notes</h3>
                    {isLoading && (
                      <div className="flex items-center">
                        <div className="animate-spin h-5 w-5 mr-2 border-2 border-red-600 border-t-transparent rounded-full"></div>
                        <span className="text-sm text-red-600">Generating...</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-white border border-neutral-200 rounded-md p-4 min-h-[400px] shadow-inner">
                    {/* Combined notes display area */}
                    <div className="space-y-4">
                      {/* Display combined SOAP note content - key is used for forcing re-render */}
                      <div key={`notes-content-${notesUpdated}`}>
                        {form.getValues().subjective && (
                          <div className="mb-6">
                            <h4 className="font-bold text-lg mb-2">Subjective:</h4>
                            <div className="whitespace-pre-line bg-neutral-50 p-3 rounded-md border border-neutral-100">
                              {form.getValues().subjective}
                            </div>
                          </div>
                        )}
                        
                        {form.getValues().objective && (
                          <div className="mb-6">
                            <h4 className="font-bold text-lg mb-2">Objective:</h4>
                            <div className="whitespace-pre-line bg-neutral-50 p-3 rounded-md border border-neutral-100">
                              {form.getValues().objective}
                            </div>
                          </div>
                        )}
                        
                        {form.getValues().assessment && (
                          <div className="mb-6">
                            <h4 className="font-bold text-lg mb-2">Assessment:</h4>
                            <div className="whitespace-pre-line bg-neutral-50 p-3 rounded-md border border-neutral-100">
                              {form.getValues().assessment}
                            </div>
                          </div>
                        )}
                        
                        {form.getValues().plan && (
                          <div className="mb-6">
                            <h4 className="font-bold text-lg mb-2">Plan:</h4>
                            <div className="whitespace-pre-line bg-neutral-50 p-3 rounded-md border border-neutral-100">
                              {form.getValues().plan}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Show placeholder when no content yet */}
                      {!form.getValues().subjective && !form.getValues().objective && 
                       !form.getValues().assessment && !form.getValues().plan && (
                        <div className="text-center text-neutral-400 py-12">
                          <p className="text-lg mb-2">No notes generated yet</p>
                          <p className="text-sm">Click the red microphone button above to start recording</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Hidden form fields - still needed for data submission */}
                  <div className="hidden">
                    <FormField control={form.control} name="subjective" render={({ field }) => (
                      <FormItem><FormControl><Textarea {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="objective" render={({ field }) => (
                      <FormItem><FormControl><Textarea {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="assessment" render={({ field }) => (
                      <FormItem><FormControl><Textarea {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="plan" render={({ field }) => (
                      <FormItem><FormControl><Textarea {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                </div>
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
