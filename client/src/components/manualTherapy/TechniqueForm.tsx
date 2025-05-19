import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, RefreshCw, Check } from 'lucide-react';
import { getTherapyTechniqueImage, getBodyPartGradient } from '../../lib/therapyImageUtils';

// Schema for the technique form
const techniqueFormSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  bodyPart: z.string({
    required_error: "Please select a body part.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  indications: z.string().min(10, {
    message: "Indications must be at least 10 characters.",
  }),
  contraindications: z.string().optional(),
  technique: z.string().min(10, {
    message: "Technique must be at least 10 characters.",
  }),
  evidence: z.string().optional(),
  videoUrl: z.string().url({ message: "Must be a valid URL" }).optional().or(z.literal('')),
  imageUrl: z.string().url({ message: "Must be a valid URL" }).optional().or(z.literal('')),
});

type TechniqueFormValues = z.infer<typeof techniqueFormSchema>;

export default function TechniqueForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Configure form with validation
  const form = useForm<TechniqueFormValues>({
    resolver: zodResolver(techniqueFormSchema),
    defaultValues: {
      title: '',
      bodyPart: '',
      description: '',
      indications: '',
      contraindications: '',
      technique: '',
      evidence: '',
      videoUrl: '',
      imageUrl: '',
    },
  });

  // Create mutation for submitting technique
  const createTechniqueMutation = useMutation({
    mutationFn: async (data: TechniqueFormValues) => {
      const response = await apiRequest('POST', '/api/manual-therapy', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create technique');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Technique created",
        description: "Your manual therapy technique has been added to the library.",
      });
      // Reset form
      form.reset();
      // Invalidate the queries to refetch the data
      queryClient.invalidateQueries({ queryKey: ['/api/manual-therapy'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: TechniqueFormValues) => {
    // Transform empty strings to null
    const formattedData = {
      title: data.title,
      bodyPart: data.bodyPart,
      description: data.description,
      indications: data.indications,
      technique: data.technique,
      contraindications: data.contraindications || undefined,
      evidence: data.evidence || undefined,
      videoUrl: data.videoUrl || undefined,
      imageUrl: data.imageUrl || undefined,
    };
    
    createTechniqueMutation.mutate(formattedData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Technique Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter the technique name" {...field} />
              </FormControl>
              <FormDescription>
                The name of the manual therapy technique
              </FormDescription>
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
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a body part" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="shoulder">Shoulder</SelectItem>
                  <SelectItem value="neck">Neck</SelectItem>
                  <SelectItem value="back">Back</SelectItem>
                  <SelectItem value="elbow">Elbow</SelectItem>
                  <SelectItem value="wrist">Wrist</SelectItem>
                  <SelectItem value="hand">Hand</SelectItem>
                  <SelectItem value="hip">Hip</SelectItem>
                  <SelectItem value="knee">Knee</SelectItem>
                  <SelectItem value="ankle">Ankle</SelectItem>
                  <SelectItem value="foot">Foot</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                The primary body part this technique is applied to
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide a brief description of the technique"
                  className="min-h-[80px] resize-y"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                A summary of what the technique is and when it's used
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="indications"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Indications</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="List conditions or symptoms where this technique is indicated"
                  className="min-h-[80px] resize-y"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                When should this technique be used
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="contraindications"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraindications</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="List any contraindications for this technique (optional)"
                  className="min-h-[80px] resize-y"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                When should this technique NOT be used
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="technique"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Technique Details</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide detailed step-by-step instructions for performing this technique"
                  className="min-h-[120px] resize-y"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                How to perform the technique correctly
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="evidence"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Evidence</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide evidence supporting this technique (optional)"
                  className="min-h-[80px] resize-y"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Research or clinical evidence supporting the effectiveness
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="videoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Video URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com/video (optional)" {...field} />
                </FormControl>
                <FormDescription>
                  Link to a demonstration video
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => {
              const title = form.watch('title');
              const bodyPart = form.watch('bodyPart');
              const [suggestedImageUrl, setSuggestedImageUrl] = useState<string>('');
              const [isPreviewVisible, setIsPreviewVisible] = useState<boolean>(false);

              // Generate suggested image URL when title and body part are available
              useEffect(() => {
                if (title && bodyPart) {
                  const url = getTherapyTechniqueImage(title, bodyPart);
                  setSuggestedImageUrl(url);
                }
              }, [title, bodyPart]);

              // Apply suggested image URL
              const applySuggestedImage = () => {
                if (suggestedImageUrl) {
                  field.onChange(suggestedImageUrl);
                  // Show confirmation for a moment
                  setIsPreviewVisible(true);
                }
              };

              return (
                <FormItem className="space-y-4">
                  <FormLabel>Image URL</FormLabel>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input 
                          placeholder="https://example.com/image.jpg (optional)" 
                          {...field} 
                          onFocus={() => setIsPreviewVisible(true)}
                          onBlur={() => {
                            // Small delay to allow button clicks
                            setTimeout(() => setIsPreviewVisible(false), 200);
                          }}
                        />
                      </FormControl>
                      {suggestedImageUrl && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon"
                          title="Use suggested image"
                          onClick={applySuggestedImage}
                          className="flex-shrink-0"
                        >
                          {field.value === suggestedImageUrl ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>

                    <FormDescription>
                      Link to an image showing the technique or use the suggested image
                    </FormDescription>
                    <FormMessage />
                  </div>
                
                  {/* Image Preview */}
                  {isPreviewVisible && (field.value || suggestedImageUrl) && (
                    <div className="mt-2">
                      <Card className="overflow-hidden">
                        <CardContent className="p-0">
                          <div className="space-y-2">
                            {field.value && (
                              <div className="rounded overflow-hidden h-40 bg-muted">
                                <img 
                                  src={field.value} 
                                  alt="Preview" 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                            
                            {!field.value && suggestedImageUrl && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1 px-4 pt-2">Suggested image:</p>
                                <div className="rounded overflow-hidden h-40 bg-muted">
                                  <img 
                                    src={suggestedImageUrl} 
                                    alt="Suggested" 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="p-2 text-center">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={applySuggestedImage}
                                    className="w-full"
                                  >
                                    Use this image
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </FormItem>
              );
            }}
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full"
          disabled={createTechniqueMutation.isPending}
        >
          {createTechniqueMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Submit Technique
        </Button>
      </form>
    </Form>
  );
}