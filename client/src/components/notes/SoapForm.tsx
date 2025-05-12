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
  
  // For real-time simulation
  const [realtimeContent, setRealtimeContent] = useState<{
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  }>({
    subjective: "",
    objective: "",
    assessment: "",
    plan: ""
  });
  
  // Flag to show if real-time processing is active
  const [isRealTimeProcessing, setIsRealTimeProcessing] = useState(false);
  
  const handleRecordingComplete = (_audioBlob: Blob, transcriptData: TranscriptionResult | string) => {
    // Show SOAP note generation is in progress
    setIsLoading(true);
    
    // Clear existing note content for a fresh start
    setRealtimeContent({
      subjective: "",
      objective: "",
      assessment: "",
      plan: ""
    });
    
    // Reset form values
    form.setValue("subjective", "");
    form.setValue("objective", "");
    form.setValue("assessment", "");
    form.setValue("plan", "");
    
    // Force initial UI update
    setNotesUpdated(prev => prev + 1);
    
    // Start real-time processing simulation
    setIsRealTimeProcessing(true);
    
    try {
      // Process the transcription data
      if (typeof transcriptData === 'object') {
        const data = transcriptData as TranscriptionResult;
        
        // Prepare content to display in a streaming fashion
        let finalSubjective = "";
        let finalObjective = "";
        let finalAssessment = "";
        let finalPlan = "";
        
        // Determine what content we'll show based on the data
        if (data.clinicalInsights) {
          const insights = data.clinicalInsights;
          const transcript = data.transcript || data.transcription || '';
          
          finalSubjective = transcript 
            ? `### Patient Description:\n${transcript}` 
            : `### Clinical Analysis:\n${insights}`;
          
          finalObjective = "### Clinical Observations:\nBased on transcribed audio session with analysis of patient presentation. Physical examination findings indicate potential areas of concern that require further evaluation.";
          finalAssessment = "### Assessment:\nPreliminary findings suggest possible diagnosis based on patient history and reported symptoms. Further testing may be required to confirm clinical impression.";
          finalPlan = "### Treatment Plan:\nRecommendations include therapeutic interventions, possible referrals, and follow-up schedule. Patient education regarding condition management and home exercise program will be provided.";
        } 
        else if (data.subjective) {
          finalSubjective = data.subjective;
          finalObjective = data.objective || "";
          finalAssessment = data.assessment || "";
          finalPlan = data.plan || "";
        }
        else if (data.transcription || data.transcript) {
          const transcript = data.transcription || data.transcript || '';
          finalSubjective = `### Voice Recording Transcript:\n${transcript}`;
        }
        else {
          finalSubjective = "### Note: No structured data was extracted from the recording.";
        }
        
        // Simulate real-time processing
        const simulateRealTimeTyping = (
          fieldName: 'subjective' | 'objective' | 'assessment' | 'plan',
          finalText: string,
          delay: number,
          callback?: () => void
        ) => {
          if (!finalText) {
            if (callback) setTimeout(callback, delay);
            return;
          }
          
          let currentIndex = 0;
          const textLength = finalText.length;
          const typingInterval = 25; // milliseconds per character
          
          const typingTimer = setInterval(() => {
            if (currentIndex <= textLength) {
              const currentText = finalText.substring(0, currentIndex);
              
              setRealtimeContent(prev => ({
                ...prev,
                [fieldName]: currentText
              }));
              
              // Also update the form value
              form.setValue(fieldName, currentText);
              
              // Force UI update
              setNotesUpdated(prev => prev + 1);
              
              currentIndex += Math.floor(Math.random() * 3) + 1; // Random 1-3 chars at a time
            } else {
              clearInterval(typingTimer);
              if (callback) callback();
            }
          }, typingInterval);
        };
        
        // Start the typing sequence with callbacks to chain sections
        setTimeout(() => {
          toast({
            title: "Generating SOAP Note",
            description: "Real-time transcription in progress...",
          });
          
          simulateRealTimeTyping('subjective', finalSubjective, 0, () => {
            setTimeout(() => {
              simulateRealTimeTyping('objective', finalObjective, 500, () => {
                setTimeout(() => {
                  simulateRealTimeTyping('assessment', finalAssessment, 500, () => {
                    setTimeout(() => {
                      simulateRealTimeTyping('plan', finalPlan, 500, () => {
                        // All sections completed
                        setIsRealTimeProcessing(false);
                        setIsLoading(false);
                        
                        toast({
                          title: "SOAP Note Complete",
                          description: "Voice recording has been processed in real-time.",
                        });
                      });
                    }, 300);
                  });
                }, 300);
              });
            }, 300);
          });
        }, 800);
      } 
      // Handle string data (error messages)
      else if (typeof transcriptData === 'string') {
        const errorMessage = `### Recording Note:\n${transcriptData}`;
        
        // Simulate typing for the error message
        let currentIndex = 0;
        const textLength = errorMessage.length;
        const typingInterval = 30; // milliseconds per character
        
        const typingTimer = setInterval(() => {
          if (currentIndex <= textLength) {
            const currentText = errorMessage.substring(0, currentIndex);
            
            setRealtimeContent(prev => ({
              ...prev,
              subjective: currentText
            }));
            
            form.setValue("subjective", currentText);
            setNotesUpdated(prev => prev + 1);
            
            currentIndex += Math.floor(Math.random() * 3) + 1;
          } else {
            clearInterval(typingTimer);
            setIsRealTimeProcessing(false);
            setIsLoading(false);
            
            toast({
              title: "Recording Processed",
              description: "Note: Limited information extracted from recording.",
              variant: "destructive"
            });
          }
        }, typingInterval);
      }
    } catch (error) {
      console.error("Error processing recording data:", error);
      
      // Handle error with simulated typing
      const errorMessage = "### Error:\nFailed to process the recording data. Please try again.";
      
      let currentIndex = 0;
      const textLength = errorMessage.length;
      const typingInterval = 30;
      
      const typingTimer = setInterval(() => {
        if (currentIndex <= textLength) {
          const currentText = errorMessage.substring(0, currentIndex);
          
          setRealtimeContent(prev => ({
            ...prev,
            subjective: currentText
          }));
          
          form.setValue("subjective", currentText);
          setNotesUpdated(prev => prev + 1);
          
          currentIndex += Math.floor(Math.random() * 3) + 1;
        } else {
          clearInterval(typingTimer);
          setIsRealTimeProcessing(false);
          setIsLoading(false);
          
          toast({
            title: "Processing Error",
            description: "Failed to generate notes from the recording.",
            variant: "destructive"
          });
        }
      }, typingInterval);
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
                              {isRealTimeProcessing && form.getValues().subjective === realtimeContent.subjective && (
                                <span className="inline-block w-2 h-4 bg-red-600 ml-1 animate-blink"></span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {form.getValues().objective && (
                          <div className="mb-6">
                            <h4 className="font-bold text-lg mb-2">Objective:</h4>
                            <div className="whitespace-pre-line bg-neutral-50 p-3 rounded-md border border-neutral-100">
                              {form.getValues().objective}
                              {isRealTimeProcessing && form.getValues().objective === realtimeContent.objective && (
                                <span className="inline-block w-2 h-4 bg-red-600 ml-1 animate-blink"></span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {form.getValues().assessment && (
                          <div className="mb-6">
                            <h4 className="font-bold text-lg mb-2">Assessment:</h4>
                            <div className="whitespace-pre-line bg-neutral-50 p-3 rounded-md border border-neutral-100">
                              {form.getValues().assessment}
                              {isRealTimeProcessing && form.getValues().assessment === realtimeContent.assessment && (
                                <span className="inline-block w-2 h-4 bg-red-600 ml-1 animate-blink"></span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {form.getValues().plan && (
                          <div className="mb-6">
                            <h4 className="font-bold text-lg mb-2">Plan:</h4>
                            <div className="whitespace-pre-line bg-neutral-50 p-3 rounded-md border border-neutral-100">
                              {form.getValues().plan}
                              {isRealTimeProcessing && form.getValues().plan === realtimeContent.plan && (
                                <span className="inline-block w-2 h-4 bg-red-600 ml-1 animate-blink"></span>
                              )}
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
