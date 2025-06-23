import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import MembershipRequired from '@/components/MembershipRequired';
import { ArrowLeft, FlaskConical, Users, Calendar, Target, FileText, Globe } from 'lucide-react';

const projectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be under 200 characters'),
  description: z.string().min(1, 'Description is required').max(1000, 'Description must be under 1000 characters'),
  hypothesis: z.string().min(1, 'Research hypothesis is required').max(500, 'Hypothesis must be under 500 characters'),
  methodology: z.string().min(1, 'Methodology is required').max(1000, 'Methodology must be under 1000 characters'),
  targetParticipantCount: z.number().min(10, 'Minimum 10 participants required').max(10000, 'Maximum 10,000 participants'),
  expectedDuration: z.string().min(1, 'Expected duration is required'),
  fundingSource: z.string().optional(),
  collaboratingInstitutions: z.array(z.string()).optional(),
  isPublic: z.boolean().default(false),
  ethicsApprovalRequired: z.boolean().default(true),
  virtualPatientCriteria: z.object({
    bodyPart: z.string().optional(),
    ageRange: z.object({
      min: z.number().min(0).max(100),
      max: z.number().min(0).max(100)
    }).optional(),
    gender: z.string().optional(),
    conditionTypes: z.array(z.string()).optional()
  }).optional()
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ResearchGap {
  id: number;
  title: string;
  description: string;
  bodyPart: string;
  gapType: string;
  priority: string;
  suggestedMethodology: string;
}

export default function CreateResearchProject() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [collaborationInput, setCollaborationInput] = useState('');
  const [collaborations, setCollaborations] = useState<string[]>([]);
  
  // Get research gap data from URL parameters
  const [searchParams] = useState(() => new URLSearchParams(location.search));
  const gapId = searchParams.get('gapId');
  const [researchGap, setResearchGap] = useState<ResearchGap | null>(null);

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: '',
      description: '',
      hypothesis: '',
      methodology: '',
      targetParticipantCount: 100,
      expectedDuration: '12-18 months',
      fundingSource: '',
      collaboratingInstitutions: [],
      isPublic: false,
      ethicsApprovalRequired: true,
      virtualPatientCriteria: {
        bodyPart: '',
        ageRange: { min: 18, max: 65 },
        gender: '',
        conditionTypes: []
      }
    }
  });

  // Load research gap data if gapId is provided
  useEffect(() => {
    if (gapId) {
      // In a real app, you'd fetch this from the API
      // For now, we'll use the data passed through URL params
      const gapTitle = searchParams.get('title');
      const gapDescription = searchParams.get('description');
      const gapBodyPart = searchParams.get('bodyPart');
      const gapMethodology = searchParams.get('methodology');
      
      if (gapTitle && gapDescription) {
        const gap: ResearchGap = {
          id: parseInt(gapId),
          title: gapTitle,
          description: gapDescription,
          bodyPart: gapBodyPart || '',
          gapType: searchParams.get('gapType') || '',
          priority: searchParams.get('priority') || '',
          suggestedMethodology: gapMethodology || ''
        };
        
        setResearchGap(gap);
        
        // Pre-fill form with gap data
        form.setValue('title', `Research Project: ${gap.title}`);
        form.setValue('description', `Research project to address the identified gap: ${gap.description}`);
        form.setValue('hypothesis', `We hypothesize that targeted interventions for ${gap.title.toLowerCase()} will improve patient outcomes compared to standard care.`);
        form.setValue('methodology', gap.suggestedMethodology || 'Randomized controlled trial with pre-post intervention measurements');
        
        if (gap.bodyPart) {
          form.setValue('virtualPatientCriteria.bodyPart', gap.bodyPart);
        }
      }
    }
  }, [gapId, searchParams, form]);

  const createProjectMutation = useMutation({
    mutationFn: async (projectData: ProjectFormData) => {
      const payload = {
        ...projectData,
        collaboratingInstitutions: collaborations,
        researchGapId: researchGap?.id || null,
        status: 'proposal',
        ethicsApprovalStatus: 'pending'
      };
      
      const response = await apiRequest("POST", "/api/research/projects", payload);
      return response.json();
    },
    onSuccess: (project) => {
      toast({
        title: "Research Project Created",
        description: `Successfully created research project: ${project.title}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/research/projects"] });
      navigate(`/research/projects/${project.id}`);
    },
    onError: (error: Error) => {
      const isAuthError = error.message?.includes("Not authenticated") || error.message?.includes("401");
      toast({
        title: "Project Creation Failed",
        description: isAuthError ? "Please log in to create research projects" : error.message || "Unable to create research project",
        variant: "destructive",
      });
      
      if (isAuthError) {
        navigate("/auth");
      }
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to create research projects",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    
    createProjectMutation.mutate(data);
  };

  const addCollaboration = () => {
    if (collaborationInput.trim() && !collaborations.includes(collaborationInput.trim())) {
      setCollaborations([...collaborations, collaborationInput.trim()]);
      setCollaborationInput('');
    }
  };

  const removeCollaboration = (institution: string) => {
    setCollaborations(collaborations.filter(inst => inst !== institution));
  };

  // Debug: Check if component is rendering
  console.log('CreateResearchProject component rendering', { user, researchGap });

  return (
    <div className="container max-w-4xl py-8 mx-auto">
      <Helmet>
        <title>Create Research Project | PhysioAI</title>
        <meta name="description" content="Create a new physiotherapy research project with virtual patient data and collaboration tools." />
      </Helmet>
      
      <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/research/gaps')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Research Gaps
            </Button>
          </div>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Create Research Project</h1>
            <p className="text-muted-foreground mt-1">
              Set up a new physiotherapy research project with virtual patient cohorts
            </p>
          </div>

          {/* Research Gap Context */}
          {researchGap && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="text-lg text-blue-900">Based on Research Gap</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <h3 className="font-semibold">{researchGap.title}</h3>
                  <p className="text-sm text-muted-foreground">{researchGap.description}</p>
                  <div className="flex gap-2">
                    <Badge variant="outline">{researchGap.bodyPart}</Badge>
                    <Badge variant="outline">{researchGap.gapType}</Badge>
                    <Badge variant="outline">{researchGap.priority} Priority</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Project Creation Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Project Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter research project title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the research project, its goals, and expected outcomes"
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
                    name="hypothesis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Research Hypothesis</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="State your research hypothesis"
                            className="min-h-[80px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Methodology */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FlaskConical className="h-5 w-5" />
                    Research Methodology
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="methodology"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Methodology</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your research methodology, study design, and data collection methods"
                            className="min-h-[120px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="targetParticipantCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Participant Count</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="100"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="expectedDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Duration</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select duration" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="6-12 months">6-12 months</SelectItem>
                                <SelectItem value="12-18 months">12-18 months</SelectItem>
                                <SelectItem value="18-24 months">18-24 months</SelectItem>
                                <SelectItem value="2-3 years">2-3 years</SelectItem>
                                <SelectItem value="3+ years">3+ years</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Virtual Patient Criteria */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Virtual Patient Cohort Criteria
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="virtualPatientCriteria.bodyPart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Body Part Focus</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select body part" />
                              </SelectTrigger>
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
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="virtualPatientCriteria.gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender Criteria</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender criteria" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Any Gender</SelectItem>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="virtualPatientCriteria.ageRange.min"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Age</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="18"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="virtualPatientCriteria.ageRange.max"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum Age</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="65"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Collaboration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Collaboration & Funding
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fundingSource"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Funding Source (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., NIH, University Grant, Private Foundation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div>
                    <FormLabel>Collaborating Institutions</FormLabel>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Add collaborating institution"
                        value={collaborationInput}
                        onChange={(e) => setCollaborationInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCollaboration())}
                      />
                      <Button type="button" variant="outline" onClick={addCollaboration}>
                        Add
                      </Button>
                    </div>
                    {collaborations.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {collaborations.map((institution, index) => (
                          <Badge key={index} variant="secondary" className="px-2 py-1">
                            {institution}
                            <button
                              type="button"
                              onClick={() => removeCollaboration(institution)}
                              className="ml-2 text-xs hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Project Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Project Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="isPublic"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Public Project</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Make this project visible to other researchers for collaboration
                          </div>
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
                  
                  <FormField
                    control={form.control}
                    name="ethicsApprovalRequired"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Ethics Approval Required</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            This project requires institutional ethics approval
                          </div>
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
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => navigate('/research/gaps')}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createProjectMutation.isPending}
                  className="min-w-[150px]"
                >
                  {createProjectMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Project'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
    </div>
  );
}