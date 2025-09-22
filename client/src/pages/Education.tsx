import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BookOpen, 
  Clock, 
  Users, 
  Star, 
  Search, 
  Filter,
  PlayCircle,
  FileText,
  Award,
  TrendingUp,
  Calendar,
  GraduationCap
} from "lucide-react";
import { Helmet } from "react-helmet";
import { Link } from "wouter";

interface Course {
  id: number;
  title: string;
  description: string;
  shortDescription: string;
  thumbnailUrl?: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  estimatedHours: number;
  status: "draft" | "published" | "archived";
  bodyPart: string;
  tags: string[];
  learningObjectives: string[];
  prerequisites: string[];
  createdBy: number;
  isPublic: boolean;
  price: number;
  createdAt: string;
  updatedAt: string;
}

interface UserEnrollment {
  id: number;
  userId: number;
  courseId: number;
  status: "enrolled" | "completed" | "dropped" | "expired";
  progress: number;
  completedModules: number[];
  totalTimeSpent: number;
  lastAccessedAt?: string;
  enrolledAt: string;
  completedAt?: string;
}

export default function Education() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [bodyPartFilter, setBodyPartFilter] = useState<string>("all");

  // Fetch available courses
  const { data: courses = [], isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/education/courses"],
    enabled: !!user,
  });

  // Fetch user enrollments
  const { data: enrollments = [], isLoading: enrollmentsLoading, refetch: refetchEnrollments } = useQuery<UserEnrollment[]>({
    queryKey: ["/api/education/enrollments"],
    enabled: !!user,
  });

  // Filter courses based on search and filters
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = difficultyFilter === "all" || course.difficulty === difficultyFilter;
    const matchesBodyPart = bodyPartFilter === "all" || course.bodyPart === bodyPartFilter;
    
    return matchesSearch && matchesDifficulty && matchesBodyPart && course.status === "published";
  });

  // Get enrolled courses with progress
  const enrolledCourses = enrollments.map(enrollment => {
    const course = courses.find(c => c.id === enrollment.courseId);
    return course ? { ...course, enrollment } : null;
  }).filter(Boolean);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "intermediate": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "advanced": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "expert": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const handleEnrollment = async (courseId: number) => {
    console.log("Enrolling in course:", courseId);
    try {
      const response = await fetch("/api/education/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });

      if (response.ok) {
        const enrollment = await response.json();
        // Refetch enrollments to update the dashboard
        refetchEnrollments();
        toast({
          title: "Enrollment Successful!",
          description: "You have been enrolled in the course. Check your dashboard to start learning.",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Enrollment Failed",
          description: error.error || "Failed to enroll in the course. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Enrollment error:", error);
      toast({
        title: "Connection Error",
        description: "Unable to connect to the server. Please check your connection and try again.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Required</CardTitle>
            <CardDescription>
              Please log in to access the Education Hub
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Education Hub - PhysioGPT Platform</title>
        <meta name="description" content="Advance your physiotherapy knowledge with our comprehensive education hub featuring courses, assessments, and certifications." />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Education Hub
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Advance your physiotherapy practice with evidence-based courses, 
            interactive case studies, and professional certifications.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card data-testid="stat-available-courses">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{courses.length}</p>
                  <p className="text-muted-foreground">Available Courses</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="stat-enrolled-courses">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{enrollments.length}</p>
                  <p className="text-muted-foreground">Enrolled Courses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-completed-courses">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Award className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {enrollments.filter(e => e.status === "completed").length}
                  </p>
                  <p className="text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-study-time">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {Math.round(enrollments.reduce((acc, e) => acc + e.totalTimeSpent, 0) / 60)}h
                  </p>
                  <p className="text-muted-foreground">Study Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">My Dashboard</TabsTrigger>
            <TabsTrigger value="catalog" data-testid="tab-catalog">Course Catalog</TabsTrigger>
            <TabsTrigger value="certificates" data-testid="tab-certificates">Certificates</TabsTrigger>
          </TabsList>

          {/* My Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Learning Progress</CardTitle>
                <CardDescription>
                  Continue your physiotherapy education journey
                </CardDescription>
              </CardHeader>
              <CardContent>
                {enrollmentsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse bg-muted h-20 rounded-lg" />
                    ))}
                  </div>
                ) : enrolledCourses.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      You haven't enrolled in any courses yet
                    </p>
                    <Button 
                      onClick={() => {
                        const catalogTab = document.querySelector('[data-testid="tab-catalog"]') as HTMLElement;
                        catalogTab?.click();
                      }}
                    >
                      Browse Courses
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {enrolledCourses.map((courseWithEnrollment: any) => (
                      <Card key={courseWithEnrollment.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold text-lg">{courseWithEnrollment.title}</h3>
                              <p className="text-muted-foreground text-sm">
                                {courseWithEnrollment.shortDescription}
                              </p>
                            </div>
                            <Badge className={getDifficultyColor(courseWithEnrollment.difficulty)}>
                              {courseWithEnrollment.difficulty}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>{courseWithEnrollment.enrollment.progress}%</span>
                            </div>
                            <Progress value={courseWithEnrollment.enrollment.progress} className="h-2" />
                          </div>
                          
                          <div className="flex justify-between items-center mt-4">
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {Math.round(courseWithEnrollment.enrollment.totalTimeSpent / 60)}h studied
                              </span>
                              <span className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                Last: {new Date(courseWithEnrollment.enrollment.lastAccessedAt || courseWithEnrollment.enrollment.enrolledAt).toLocaleDateString()}
                              </span>
                            </div>
                            <Link to={`/education/course/${courseWithEnrollment.id}`}>
                              <Button size="sm" data-testid={`continue-course-${courseWithEnrollment.id}`}>
                                Continue Learning
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Course Catalog */}
          <TabsContent value="catalog" className="space-y-6">
            {/* Search and Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search courses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        data-testid="search-courses"
                      />
                    </div>
                  </div>
                  
                  <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="filter-difficulty">
                      <SelectValue placeholder="Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={bodyPartFilter} onValueChange={setBodyPartFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="filter-body-part">
                      <SelectValue placeholder="Body Part" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Body Parts</SelectItem>
                      <SelectItem value="shoulder">Shoulder</SelectItem>
                      <SelectItem value="neck">Neck</SelectItem>
                      <SelectItem value="back">Back</SelectItem>
                      <SelectItem value="elbow">Elbow</SelectItem>
                      <SelectItem value="hip">Hip</SelectItem>
                      <SelectItem value="knee">Knee</SelectItem>
                      <SelectItem value="ankle">Ankle</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Course Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coursesLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-40 bg-muted rounded-t-lg" />
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-full" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : filteredCourses.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No courses found matching your criteria
                  </p>
                </div>
              ) : (
                filteredCourses.map((course) => (
                  <Card key={course.id} className="hover:shadow-lg transition-shadow" data-testid={`course-card-${course.id}`}>
                    <div className="h-40 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-lg flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-white" />
                    </div>
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-lg line-clamp-2">{course.title}</h3>
                          <Badge className={getDifficultyColor(course.difficulty)}>
                            {course.difficulty}
                          </Badge>
                        </div>
                        
                        <p className="text-muted-foreground text-sm line-clamp-2">
                          {course.shortDescription || course.description}
                        </p>

                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {course.estimatedHours}h
                          </span>
                          <span className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            0 enrolled
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-2">
                          {course.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        <div className="pt-4">
                          <Button 
                            className="w-full" 
                            onClick={() => handleEnrollment(course.id)}
                            data-testid={`enroll-course-${course.id}`}
                          >
                            {course.price > 0 ? `Enroll - $${(course.price / 100).toFixed(2)}` : "Enroll for Free"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Certificates */}
          <TabsContent value="certificates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Certificates</CardTitle>
                <CardDescription>
                  Professional certificates earned through course completion
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Award className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No certificates earned yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Complete courses to earn professional certificates
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}