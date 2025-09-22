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
  Award
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
                  
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {selectedModule.content ? (
                      <div>
                        <h3>Module Content</h3>
                        {typeof selectedModule.content === 'string' ? (
                          <p>{selectedModule.content}</p>
                        ) : (
                          <pre className="bg-muted p-4 rounded-lg overflow-auto">
                            {JSON.stringify(selectedModule.content, null, 2)}
                          </pre>
                        )}
                      </div>
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