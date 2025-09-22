import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  BookOpen, 
  Clock, 
  CheckCircle, 
  PlayCircle,
  FileText,
  ArrowLeft,
  ChevronRight,
  Users,
  Award,
  Brain,
  Camera,
  Activity,
  Zap,
  Target,
  Microscope,
  Stethoscope,
  AlertCircle,
  ExternalLink,
  Eye,
  Bot,
  Lightbulb,
  MessageSquare
} from "lucide-react";
import { Helmet } from "react-helmet";
import { Link } from "wouter";

interface CourseModule {
  id: number;
  courseId: number;
  title: string;
  description: string;
  type: "video" | "text" | "assessment" | "interactive" | "case_study";
  content: any;
  videoUrl?: string;
  duration: number;
  order: number;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Course {
  id: number;
  title: string;
  description: string;
  shortDescription: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  estimatedHours: number;
  bodyPart: string;
  tags: string[];
  learningObjectives: string[];
  prerequisites: string[];
}

interface UserEnrollment {
  id: number;
  userId: number;
  courseId: number;
  status: "enrolled" | "in_progress" | "completed" | "dropped";
  progress: number;
  completedModules: number[];
  totalTimeSpent: number;
  enrolledAt: string;
  completedAt?: string;
}

// Interactive Content Renderer Component
const InteractiveContentRenderer = ({ content }: { content: any }) => {
  if (!content || typeof content !== 'object') {
    return (
      <div className="text-center py-8">
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Content is being prepared...</p>
      </div>
    );
  }

  const renderSection = (section: any, index: number) => {
    return (
      <Card key={section.id || index} className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getSectionIcon(section.type)}
            {section.title}
          </CardTitle>
          <CardDescription>{section.content}</CardDescription>
        </CardHeader>
        <CardContent>
          {section.interactiveElements?.map((element: any, elementIndex: number) => (
            <div key={elementIndex} className="space-y-4">
              {renderInteractiveElement(element)}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case "3d_body_scanner": return <Microscope className="h-5 w-5 text-blue-500" />;
      case "ai_guided_assessment": return <Brain className="h-5 w-5 text-purple-500" />;
      case "motion_analysis": return <Activity className="h-5 w-5 text-green-500" />;
      case "live_motion_analysis": return <Camera className="h-5 w-5 text-red-500" />;
      case "virtual_patient_practice": return <Users className="h-5 w-5 text-orange-500" />;
      case "3d_patient_scenarios": return <Eye className="h-5 w-5 text-cyan-500" />;
      case "exercise_database_integration": return <Target className="h-5 w-5 text-emerald-500" />;
      case "physio_gpt_mentorship": return <Bot className="h-5 w-5 text-indigo-500" />;
      case "advanced_3d_scenarios": return <Zap className="h-5 w-5 text-yellow-500" />;
      default: return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const renderInteractiveElement = (element: any) => {
    switch (element.type) {
      case "body_scanner_integration":
        return (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Microscope className="h-8 w-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">3D Body Scanner Integration</h4>
                <p className="text-blue-700 dark:text-blue-300 mb-3">{element.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {element.features?.map((feature: string, i: number) => (
                    <Badge key={i} variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                      {feature.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Body Scanner
                </Button>
              </div>
            </div>
          </div>
        );

      case "physio_gpt_tutor":
      case "physio_gpt_clinical_mentor":
      case "advanced_clinical_mentor":
        return (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Brain className="h-8 w-8 text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">PhysioGPT AI Assistant</h4>
                <p className="text-purple-700 dark:text-purple-300 mb-3">
                  Get expert clinical guidance and real-time assistance
                </p>
                <div className="space-y-2 mb-3">
                  {element.prompts?.map((prompt: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                      <MessageSquare className="h-3 w-3" />
                      {prompt}
                    </div>
                  ))}
                </div>
                <Button className="bg-purple-600 hover:bg-purple-700" size="sm">
                  <Bot className="h-4 w-4 mr-2" />
                  Start AI Session
                </Button>
              </div>
            </div>
          </div>
        );

      case "pose_detection_lab":
      case "pose_detection_analysis":
        return (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Camera className="h-8 w-8 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">Live Motion Analysis</h4>
                <p className="text-green-700 dark:text-green-300 mb-3">{element.description}</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {element.exercises?.map((exercise: string, i: number) => (
                    <div key={i} className="bg-green-100 dark:bg-green-800 p-2 rounded text-sm text-green-800 dark:text-green-200">
                      {exercise.replace(/_/g, ' ')}
                    </div>
                  ))}
                </div>
                <Button className="bg-green-600 hover:bg-green-700" size="sm">
                  <Activity className="h-4 w-4 mr-2" />
                  Start Motion Capture
                </Button>
              </div>
            </div>
          </div>
        );

      case "virtual_patient_assessment":
      case "virtual_patient_movement_lab":
      case "complex_virtual_patients":
        return (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-6 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-orange-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">Virtual Patient Practice</h4>
                <p className="text-orange-700 dark:text-orange-300 mb-3">{element.description}</p>
                <div className="space-y-2 mb-3">
                  {(element.patients || element.pathologies || element.cases)?.map((item: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                      <Stethoscope className="h-3 w-3" />
                      {item.replace(/_/g, ' ')}
                    </div>
                  ))}
                </div>
                <Button className="bg-orange-600 hover:bg-orange-700" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Open Virtual Patients
                </Button>
              </div>
            </div>
          </div>
        );

      case "exercise_database_builder":
        return (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-6 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Target className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-2">Exercise Prescription Builder</h4>
                <p className="text-emerald-700 dark:text-emerald-300 mb-3">{element.description}</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {element.pathology_specific?.map((pathology: string, i: number) => (
                    <div key={i} className="bg-emerald-100 dark:bg-emerald-800 p-2 rounded text-sm text-emerald-800 dark:text-emerald-200">
                      {pathology.replace(/_/g, ' ')}
                    </div>
                  ))}
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700" size="sm">
                  <Target className="h-4 w-4 mr-2" />
                  Open Exercise Database
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              <span className="font-medium">Interactive Element</span>
            </div>
            <p className="text-sm text-muted-foreground">{element.description || "Interactive content available"}</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Content Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 rounded-lg border border-indigo-200 dark:border-indigo-800">
        <div className="flex items-center gap-3 mb-2">
          {getSectionIcon(content.type)}
          <h3 className="text-xl font-semibold text-indigo-900 dark:text-indigo-100">{content.title}</h3>
        </div>
        <p className="text-indigo-700 dark:text-indigo-300">{content.description}</p>
      </div>

      {/* Interactive Sections */}
      {content.sections?.map((section: any, index: number) => renderSection(section, index))}

      {/* AI Integration Summary */}
      {content.ai_integration && (
        <Card className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-violet-200 dark:border-violet-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-violet-900 dark:text-violet-100">
              <Bot className="h-5 w-5" />
              AI Integration Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(content.ai_integration).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-violet-600" />
                  <span className="text-sm text-violet-700 dark:text-violet-300">
                    {key.replace(/_/g, ' ')}: {typeof value === 'string' ? value : '✓ Enabled'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assessments */}
      {content.assessments && content.assessments.length > 0 && (
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
              <Award className="h-5 w-5" />
              Module Assessments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {content.assessments.map((assessment: any, index: number) => (
                <div key={index} className="bg-amber-100 dark:bg-amber-800 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-amber-900 dark:text-amber-100">{assessment.title}</h4>
                    <Badge className="bg-amber-200 text-amber-800 dark:bg-amber-700 dark:text-amber-200">
                      {assessment.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">{assessment.description}</p>
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Start Assessment
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default function CourseContent() {
  const { user } = useAuth();
  const [match, params] = useRoute("/education/course/:id");
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  
  const courseId = params?.id ? parseInt(params.id) : null;

  // Fetch course details
  const { data: course, isLoading: courseLoading } = useQuery<Course>({
    queryKey: [`/api/education/courses/${courseId}`],
    enabled: !!courseId,
  });

  // Fetch course modules
  const { data: modules = [], isLoading: modulesLoading } = useQuery<CourseModule[]>({
    queryKey: [`/api/education/courses/${courseId}/modules`],
    enabled: !!courseId,
  });

  // Fetch user enrollment
  const { data: enrollment, isLoading: enrollmentLoading } = useQuery<UserEnrollment>({
    queryKey: [`/api/education/enrollments/${courseId}`],
    enabled: !!courseId && !!user,
  });

  const selectedModule = selectedModuleId ? modules.find(m => m.id === selectedModuleId) : modules[0];

  const getModuleIcon = (type: string) => {
    switch (type) {
      case "video": return <PlayCircle className="h-4 w-4" />;
      case "text": return <FileText className="h-4 w-4" />;
      case "assessment": return <CheckCircle className="h-4 w-4" />;
      case "interactive": return <Users className="h-4 w-4" />;
      case "case_study": return <BookOpen className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getModuleTypeColor = (type: string) => {
    switch (type) {
      case "video": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "text": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "assessment": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "interactive": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "case_study": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const isModuleCompleted = (moduleId: number) => {
    return enrollment?.completedModules?.includes(moduleId) || false;
  };

  if (!courseId || !match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Course Not Found</CardTitle>
            <CardDescription>
              The course you're looking for doesn't exist or has been removed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/education">
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Education Hub
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Required</CardTitle>
            <CardDescription>
              Please log in to access course content.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/auth">
              <Button className="w-full">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (courseLoading || modulesLoading || enrollmentLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-4" />
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <div className="h-80 bg-muted rounded" />
              </div>
              <div className="lg:col-span-3">
                <div className="h-96 bg-muted rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Course Not Found</CardTitle>
            <CardDescription>
              The course you're looking for doesn't exist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/education">
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Education Hub
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Enrollment Required</CardTitle>
            <CardDescription>
              You need to enroll in this course to access the content.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/education">
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Course Catalog
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{course?.title ? `${course.title} - PhysioGPT Education` : 'Course Content - PhysioGPT Education'}</title>
        <meta name="description" content={course?.shortDescription || course?.description || 'PhysioGPT Education Course'} />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/education">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Education Hub
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">{course.title}</h1>
            <p className="text-muted-foreground">{course.shortDescription}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Course Progress</span>
              <span className="text-sm text-muted-foreground">{enrollment.progress}% Complete</span>
            </div>
            <Progress value={enrollment.progress} className="h-2" />
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>{enrollment.completedModules?.length || 0} of {modules.length} modules completed</span>
              <span>{Math.round(enrollment.totalTimeSpent / 60)}h spent</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Module Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Course Modules</CardTitle>
                <CardDescription>
                  {modules.length} modules • {course.estimatedHours}h total
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1">
                  {modules.map((module, index) => (
                    <button
                      key={module.id}
                      onClick={() => setSelectedModuleId(module.id)}
                      className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 transition-colors ${
                        selectedModule?.id === module.id ? "bg-muted" : ""
                      }`}
                      data-testid={`module-${module.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                          isModuleCompleted(module.id) 
                            ? "bg-green-500 text-white" 
                            : "bg-muted-foreground/20 text-muted-foreground"
                        }`}>
                          {isModuleCompleted(module.id) ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <span className="text-xs font-medium">{index + 1}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getModuleIcon(module.type)}
                            <Badge className={`text-xs ${getModuleTypeColor(module.type)}`}>
                              {module.type}
                            </Badge>
                          </div>
                          <p className="font-medium text-sm truncate">{module.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{module.duration}min</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedModule ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {getModuleIcon(selectedModule.type)}
                        {selectedModule.title}
                      </CardTitle>
                      <CardDescription>{selectedModule.description}</CardDescription>
                    </div>
                    <Badge className={getModuleTypeColor(selectedModule.type)}>
                      {selectedModule.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedModule.type === "video" && selectedModule.videoUrl ? (
                    <div className="mb-6">
                      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <PlayCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground">Video content will be loaded here</p>
                          <p className="text-sm text-muted-foreground mt-1">URL: {selectedModule.videoUrl}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  
                  <div className="space-y-6">
                    {selectedModule.content ? (
                      <InteractiveContentRenderer content={selectedModule.content} />
                    ) : (
                      <div className="text-center py-8">
                        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          Module content is being prepared. Check back soon!
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{selectedModule.duration} minutes</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!isModuleCompleted(selectedModule.id) && (
                        <Button size="sm" data-testid={`complete-module-${selectedModule.id}`}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Complete
                        </Button>
                      )}
                      
                      {modules.findIndex(m => m.id === selectedModule.id) < modules.length - 1 && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            const currentIndex = modules.findIndex(m => m.id === selectedModule.id);
                            const nextModule = modules[currentIndex + 1];
                            if (nextModule) setSelectedModuleId(nextModule.id);
                          }}
                        >
                          Next Module
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Select a module from the sidebar to begin learning
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}