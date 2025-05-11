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
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import VoiceRecorder from "@/components/notes/VoiceRecorder";
import { soapNoteInputSchema } from "@shared/schema";

interface SoapFormProps {
  onNoteGenerated: (noteData: any) => void;
}

const SoapForm = ({ onNoteGenerated }: SoapFormProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [inputMethod, setInputMethod] = useState<"text" | "voice">("text");

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
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  
  const handleRecordingComplete = (_audioBlob: Blob, transcriptData: TranscriptionResult | string) => {
    // Update form with data from the transcription analysis
    const { subjective, objective, assessment, plan } = form.getValues();
    
    // If we received SOAP sections from the analysis, use them
    if (typeof transcriptData === 'object' && 'subjective' in transcriptData && transcriptData.subjective) {
      // We have structured SOAP data
      const soapData = transcriptData as TranscriptionResult;
      
      if (soapData.subjective) {
        form.setValue("subjective", subjective 
          ? `${subjective}\n\n${soapData.subjective}` 
          : soapData.subjective);
      }
      
      if (soapData.objective) {
        form.setValue("objective", objective 
          ? `${objective}\n\n${soapData.objective}` 
          : soapData.objective);
      }
      
      if (soapData.assessment) {
        form.setValue("assessment", assessment 
          ? `${assessment}\n\n${soapData.assessment}` 
          : soapData.assessment);
      }
      
      if (soapData.plan) {
        form.setValue("plan", plan 
          ? `${plan}\n\n${soapData.plan}` 
          : soapData.plan);
      }
    } else {
      // If it's just a raw transcript, add it to the subjective field
      let transcript: string;
      
      if (typeof transcriptData === 'string') {
        transcript = transcriptData;
      } else if (typeof transcriptData === 'object' && 'transcript' in transcriptData && transcriptData.transcript) {
        transcript = transcriptData.transcript;
      } else {
        transcript = 'Transcript unavailable';
      }
      
      form.setValue("subjective", subjective 
        ? `${subjective}\n\nFrom Recording:\n${transcript}` 
        : transcript);
    }
    
    toast({
      title: "Recording Processed",
      description: "Voice recording has been transcribed and added to the SOAP note form.",
    });
  };

  return (
    <Card className="bg-white">
      <CardContent className="p-6 sm:p-10">
        <div className="space-y-6">
          <div className="pb-5 border-b border-neutral-200">
            <h3 className="text-lg leading-6 font-medium text-neutral-900">Patient Information</h3>
            <p className="mt-2 max-w-4xl text-sm text-neutral-500">
              Enter patient details and notes to generate a clinical SOAP note.
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
                </div>

                {/* Voice Recording Tab */}
                <Tabs 
                  defaultValue="text" 
                  onValueChange={(value) => setInputMethod(value as "text" | "voice")}
                  className="mb-6 w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="text">Text Input</TabsTrigger>
                    <TabsTrigger value="voice">Voice Recording</TabsTrigger>
                  </TabsList>
                  <TabsContent value="voice" className="mt-6">
                    <div className="mb-4 p-4 bg-primary-50 rounded-lg text-primary-800">
                      <p className="text-sm">
                        Record your clinical session and let our AI transcribe the audio. 
                        The transcription will be added to your notes.
                      </p>
                    </div>
                    <VoiceRecorder onRecordingComplete={handleRecordingComplete} />
                  </TabsContent>
                </Tabs>

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
