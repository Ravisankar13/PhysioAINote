import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { soapNoteInputSchema, SoapNoteInput } from '@shared/schema';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

const TestNoteGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNote, setGeneratedNote] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Redirect to auth page if not logged in
  if (!user) {
    toast({
      title: "Authentication required",
      description: "You need to log in to use the note generator.",
      variant: "destructive",
    });
    return <Redirect to="/auth" />;
  }

  const form = useForm({
    resolver: zodResolver(soapNoteInputSchema),
    defaultValues: {
      patientName: "",
      patientId: "",
      dateOfBirth: "",
      dateOfVisit: new Date().toISOString().split('T')[0],
      subjective: "",
      objective: "",
      assessment: "",
      plan: "",
      bodyPart: "knee",
    },
  });

  const onSubmit = useCallback(async (data: SoapNoteInput) => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/notes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error generating note');
      }

      const generatedData = await response.json();
      setGeneratedNote(generatedData);
      
      toast({
        title: "Note generated successfully",
        description: "AI has enhanced your clinical note.",
      });
    } catch (error: any) {
      console.error('Error generating note:', error);
      toast({
        title: "Failed to generate note",
        description: error.message || "An error occurred while generating the note.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [toast]);

  const saveGeneratedNote = async () => {
    if (!generatedNote) return;
    
    try {
      // Prepare the note for saving
      const noteToSave = {
        patientName: generatedNote.patientName,
        patientId: generatedNote.patientId,
        dateOfBirth: generatedNote.dateOfBirth,
        dateOfVisit: generatedNote.dateOfVisit,
        subjective: generatedNote.subjective,
        objective: generatedNote.objective,
        assessment: generatedNote.assessment,
        plan: generatedNote.plan,
        bodyPart: form.getValues().bodyPart,
        visibility: "private"
      };

      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(noteToSave),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error saving note');
      }

      const savedNote = await response.json();
      
      toast({
        title: "Note saved successfully",
        description: "Your clinical note has been saved to your account.",
      });
    } catch (error: any) {
      console.error('Error saving note:', error);
      toast({
        title: "Failed to save note",
        description: error.message || "An error occurred while saving the note.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6">AI SOAP Note Generator</h1>
      
      <div className="grid grid-cols-1 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Clinical Note Information</CardTitle>
            <CardDescription>
              Enter the basic patient information and clinical observations below. The AI will enhance and format your notes into a comprehensive SOAP format.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="patientName"
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
                    name="patientId"
                    render={({ field }) => (
                      <FormItem>
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
                      <FormItem>
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
                      <FormItem>
                        <FormLabel>Date of Visit</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bodyPart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Body Part</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a body part" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="knee">Knee</SelectItem>
                            <SelectItem value="shoulder">Shoulder</SelectItem>
                            <SelectItem value="back">Back</SelectItem>
                            <SelectItem value="neck">Neck</SelectItem>
                            <SelectItem value="elbow">Elbow</SelectItem>
                            <SelectItem value="wrist">Wrist</SelectItem>
                            <SelectItem value="hand">Hand</SelectItem>
                            <SelectItem value="hip">Hip</SelectItem>
                            <SelectItem value="ankle">Ankle</SelectItem>
                            <SelectItem value="foot">Foot</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="subjective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subjective</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Patient reports pain in right knee after running. Pain is 5/10 and worse with stairs."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Patient's reported symptoms, history, and complaints.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="objective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objective</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="ROM: Flexion 0-120°, Extension -5°. Pain on palpation of medial joint line."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Physical examination findings, measurements, and observations.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assessment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assessment (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Suspected meniscal injury. Mild joint effusion."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Clinical impression, diagnosis, or assessment of the patient's condition.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="plan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Strengthening exercises for quadriceps. Ice 20 min 3x/day."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Treatment plan, interventions, and recommendations.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    size="lg"
                    disabled={isGenerating}
                  >
                    {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isGenerating ? "Generating..." : "Generate SOAP Note"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {generatedNote && (
          <Card>
            <CardHeader>
              <CardTitle>Generated SOAP Note</CardTitle>
              <CardDescription>
                AI-enhanced clinical note for {generatedNote.patientName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="formatted">
                <TabsList className="mb-4">
                  <TabsTrigger value="formatted">Formatted Note</TabsTrigger>
                  <TabsTrigger value="sections">By Section</TabsTrigger>
                </TabsList>
                
                <TabsContent value="formatted" className="space-y-4">
                  <div className="prose max-w-none">
                    <h3>Patient Information</h3>
                    <p><strong>Name:</strong> {generatedNote.patientName}</p>
                    <p><strong>ID:</strong> {generatedNote.patientId}</p>
                    <p><strong>DOB:</strong> {generatedNote.dateOfBirth}</p>
                    <p><strong>Visit Date:</strong> {generatedNote.dateOfVisit}</p>
                    
                    <h3>Subjective</h3>
                    <p>{generatedNote.subjective}</p>
                    
                    <h3>Objective</h3>
                    <p>{generatedNote.objective}</p>
                    
                    <h3>Assessment</h3>
                    <p>{generatedNote.assessment}</p>
                    
                    <h3>Plan</h3>
                    <p>{generatedNote.plan}</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="sections" className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">Subjective:</h3>
                    <Textarea readOnly value={generatedNote.subjective} className="min-h-[100px]" />
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Objective:</h3>
                    <Textarea readOnly value={generatedNote.objective} className="min-h-[100px]" />
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Assessment:</h3>
                    <Textarea readOnly value={generatedNote.assessment} className="min-h-[100px]" />
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Plan:</h3>
                    <Textarea readOnly value={generatedNote.plan} className="min-h-[100px]" />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                onClick={saveGeneratedNote}
                variant="secondary"
                className="mr-2"
              >
                Save Note
              </Button>
              <Button 
                onClick={() => {
                  setGeneratedNote(null);
                  form.reset();
                }}
                variant="outline"
              >
                New Note
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TestNoteGenerator;