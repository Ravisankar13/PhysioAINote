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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { bodyPartEnum } from "@shared/schema";

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

const complexityOptions = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

// Form schema for creating a case study
const formSchema = z.object({
  bodyPart: z.enum(bodyPartEnum.enumValues, {
    required_error: "Body part is required.",
    invalid_type_error: "Body part must be valid."
  }),
  complexity: z.enum(["beginner", "intermediate", "advanced"], {
    required_error: "Complexity level is required.",
  }),
  includeResearch: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface CreateCaseStudyFormProps {
  onCaseCreated: (caseId: number) => void;
  onCancel: () => void;
}

export default function CreateCaseStudyForm({ onCaseCreated, onCancel }: CreateCaseStudyFormProps) {
  const { toast } = useToast();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bodyPart: "shoulder",
      complexity: "beginner",
      includeResearch: true,
    },
  });

  const createCaseMutation = useMutation({
    mutationFn: async (data: FormData) => {
      try {
        const response = await fetch("/api/case-studies", {
          method: "POST",
          body: JSON.stringify(data),
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include" // Important for sending cookies
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `Error ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/case-studies'] });
      toast({
        title: "Success",
        description: "Case study created successfully",
      });
      onCaseCreated(data.id);
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      
      // Check for membership required error
      if (error.message.includes('membership_required') || error.message.includes('membership required')) {
        toast({
          title: "Membership Required",
          description: "You need a paid membership to create AI case studies",
          variant: "destructive",
        });
      } 
      // Check for OpenAI API rate limiting error
      else if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('rate limit')) {
        toast({
          title: "AI Service Unavailable",
          description: "The AI service is currently at capacity. Please try again later or use the existing case studies.",
          variant: "destructive",
        });
      }
      else {
        toast({
          title: "Error",
          description: `Failed to create case study: ${error.message}`,
          variant: "destructive",
        });
      }
    },
  });

  function onSubmit(data: FormData) {
    createCaseMutation.mutate(data);
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create AI Case Study</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="bodyPart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body Part</FormLabel>
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
                    <FormDescription>
                      Which body part should the case focus on?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="complexity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complexity Level</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select complexity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {complexityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      How complex should the case be?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="includeResearch"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Include Research References</FormLabel>
                    <FormDescription>
                      Include recent research papers and expert sources in the case
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
              <h4 className="font-medium text-amber-800 mb-2">Generation Information</h4>
              <p className="text-sm text-amber-700">
                This will generate a detailed, research-based physiotherapy case study. 
                The AI will create a realistic patient scenario, correct diagnosis, assessment tests, 
                and evidence-based treatment options.
              </p>
              <p className="text-sm text-amber-700 mt-2">
                The generation process may take 30-60 seconds to complete.
              </p>
            </div>

            <div className="flex justify-end space-x-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={createCaseMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createCaseMutation.isPending}
              >
                {createCaseMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Case Study...
                  </>
                ) : (
                  "Generate Case Study"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}