import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Filter, Plus, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis
} from '@/components/ui/pagination';

// Exercise type matching database schema
interface Exercise {
  id: number;
  title: string;
  description: string;
  bodyPart: string;
  targetMuscles: string;
  difficulty: string;
  instructions: string;
  precautions: string | null;
  repetitions: string | null;
  sets: string | null;
  duration: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  aiGenerated: boolean;
}

// Exercise list component
export default function ExerciseList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // State for filters
  const [bodyPart, setBodyPart] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('');
  const [activeTab, setActiveTab] = useState('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const exercisesPerPage = 6; // Number of exercises per page
  
  // Fetch exercises with filters
  const { data: exercises, isLoading, isError, error, refetch } = useQuery<Exercise[]>({
    queryKey: ['/api/exercises', bodyPart, difficulty],
    queryFn: async () => {
      let url = '/api/exercises';
      
      // Add query parameters if filters are set
      const params = new URLSearchParams();
      if (bodyPart) params.append('bodyPart', bodyPart);
      if (difficulty) params.append('difficulty', difficulty);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      return fetch(url).then(res => {
        if (!res.ok) throw new Error('Failed to fetch exercises');
        return res.json();
      });
    }
  });
  
  // Filter exercises by tab
  const filteredExercises = exercises?.filter(exercise => {
    if (activeTab === 'all') return true;
    return exercise.bodyPart === activeTab;
  });
  
  // Calculate pagination
  const totalExercises = filteredExercises?.length || 0;
  const totalPages = Math.ceil(totalExercises / exercisesPerPage);
  
  // Get current page exercises
  const currentExercises = filteredExercises ? filteredExercises.slice(
    (currentPage - 1) * exercisesPerPage,
    currentPage * exercisesPerPage
  ) : [];
  
  // Handle exercise generation
  const handleGenerateExercises = async (bodyPart: string, difficulty: string, count: number = 3) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "You need to be logged in to generate exercises.",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }
    
    try {
      const response = await fetch('/api/exercises/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bodyPart, difficulty, count })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate exercises');
      }
      
      const generatedExercises = await response.json();
      
      toast({
        title: "Exercises Generated",
        description: `Successfully generated ${generatedExercises.length} new exercises.`
      });
      
      // Refetch exercises to include newly generated ones
      refetch();
      
      // Set filters to match the generated exercises
      setBodyPart(bodyPart);
      setDifficulty(difficulty);
      setActiveTab(bodyPart);
      
    } catch (error) {
      console.error('Error generating exercises:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  };
  
  // Reset filters
  const resetFilters = () => {
    setBodyPart('');
    setDifficulty('');
    setCurrentPage(1); // Reset to first page when filters change
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">Error loading exercises: {error instanceof Error ? error.message : 'Unknown error'}</p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exercise Library</h1>
          <p className="text-muted-foreground mt-1">
            Browse evidence-based exercises for different body parts and difficulty levels
          </p>
        </div>
        
        <div className="flex mt-4 md:mt-0 space-x-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filter Exercises</SheetTitle>
                <SheetDescription>
                  Narrow down exercises by body part and difficulty level
                </SheetDescription>
              </SheetHeader>
              
              <div className="py-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bodyPart">Body Part</Label>
                  <Select 
                    value={bodyPart} 
                    onValueChange={setBodyPart}
                  >
                    <SelectTrigger id="bodyPart">
                      <SelectValue placeholder="All body parts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All body parts</SelectItem>
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
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select 
                    value={difficulty} 
                    onValueChange={setDifficulty}
                  >
                    <SelectTrigger id="difficulty">
                      <SelectValue placeholder="All difficulty levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All difficulty levels</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={resetFilters}>Reset</Button>
                <Button onClick={() => refetch()}>Apply Filters</Button>
              </div>
            </SheetContent>
          </Sheet>
          
          {user && (
            <Sheet>
              <SheetTrigger asChild>
                <Button className="gap-2" variant="default">
                  <Plus className="h-4 w-4" />
                  Generate
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Generate Exercises</SheetTitle>
                  <SheetDescription>
                    Create AI-generated exercises for specific body parts
                  </SheetDescription>
                </SheetHeader>
                
                <div className="py-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="genBodyPart">Body Part</Label>
                    <Select 
                      value={bodyPart} 
                      onValueChange={setBodyPart}
                    >
                      <SelectTrigger id="genBodyPart">
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
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="genDifficulty">Difficulty Level</Label>
                    <Select 
                      value={difficulty} 
                      onValueChange={setDifficulty}
                    >
                      <SelectTrigger id="genDifficulty">
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button 
                  onClick={() => handleGenerateExercises(bodyPart, difficulty)}
                  disabled={!bodyPart || !difficulty}
                  className="w-full"
                >
                  Generate Exercises
                </Button>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
      
      <Tabs 
        defaultValue="all" 
        value={activeTab} 
        onValueChange={(value) => {
          setActiveTab(value);
          setCurrentPage(1); // Reset to first page when changing tabs
        }}>
        <TabsList className="mb-4 flex overflow-x-auto pb-2 max-w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="shoulder">Shoulder</TabsTrigger>
          <TabsTrigger value="neck">Neck</TabsTrigger>
          <TabsTrigger value="back">Back</TabsTrigger>
          <TabsTrigger value="elbow">Elbow</TabsTrigger>
          <TabsTrigger value="wrist">Wrist</TabsTrigger>
          <TabsTrigger value="hand">Hand</TabsTrigger>
          <TabsTrigger value="hip">Hip</TabsTrigger>
          <TabsTrigger value="knee">Knee</TabsTrigger>
          <TabsTrigger value="ankle">Ankle</TabsTrigger>
          <TabsTrigger value="foot">Foot</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-0">
          {filteredExercises && filteredExercises.length > 0 ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {currentExercises?.map((exercise) => (
                  <ExerciseCard key={exercise.id} exercise={exercise} />
                )) || []}
              </div>
              
              {/* Pagination controls */}
              {totalPages > 1 && (
                <Pagination className="mt-8">
                  <PaginationContent>
                    <div className="hidden sm:flex items-center space-x-2 mr-2 text-sm text-muted-foreground">
                      <span>Page {currentPage} of {totalPages}</span>
                    </div>
                    {currentPage > 1 && (
                      <PaginationItem>
                        <PaginationPrevious onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} />
                      </PaginationItem>
                    )}
                    
                    {/* Display limited page numbers with ellipsis for many pages */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Always show first and last page
                        if (page === 1 || page === totalPages) return true;
                        // Show pages near current page
                        if (Math.abs(page - currentPage) <= 1) return true;
                        return false;
                      })
                      .map((page, index, array) => {
                        // Add ellipsis between non-consecutive pages
                        if (index > 0 && array[index] - array[index - 1] > 1) {
                          return (
                            <React.Fragment key={`ellipsis-${page}`}>
                              <PaginationItem key={`ellipsis-before-${page}`}>
                                <span className="flex h-9 w-9 items-center justify-center">
                                  ...
                                </span>
                              </PaginationItem>
                              <PaginationItem key={page}>
                                <PaginationLink 
                                  isActive={page === currentPage} 
                                  onClick={() => setCurrentPage(page)}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            </React.Fragment>
                          );
                        }
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink 
                              isActive={page === currentPage} 
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                    
                    {currentPage < totalPages && (
                      <PaginationItem>
                        <PaginationNext onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} />
                      </PaginationItem>
                    )}
                  </PaginationContent>
                </Pagination>
              )}
              
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Showing <span className="font-medium">{(currentPage - 1) * exercisesPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * exercisesPerPage, totalExercises)}</span> of <span className="font-medium">{totalExercises}</span> exercises
              </div>
              
              {/* Optimize loading by prefetching adjacent pages */}
              {Array.from(
                { length: 2 }, 
                (_, i) => currentPage + (i === 0 ? -1 : 1)
              )
                .filter(page => page > 0 && page <= totalPages)
                .map(page => (
                  <div key={`prefetch-page-${page}`} className="hidden">
                    {/* This invisible container helps prefetch adjacent pages */}
                  </div>
                ))}
            </>
          ) : (
            <div className="text-center py-12 border rounded-lg">
              <p className="text-muted-foreground mb-4">No exercises found for the selected filters.</p>
              {user && (
                <Button onClick={() => handleGenerateExercises(activeTab !== 'all' ? activeTab : 'general', 'beginner')}>
                  Generate {activeTab !== 'all' ? activeTab : ''} Exercises
                </Button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Exercise card component
function ExerciseCard({ exercise }: { exercise: Exercise }) {
  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow duration-300">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg line-clamp-2">{exercise.title}</CardTitle>
          <Badge 
            variant={
              exercise.difficulty === 'beginner' ? 'outline' : 
              exercise.difficulty === 'intermediate' ? 'secondary' : 
              'default'
            }
            className="whitespace-nowrap"
          >
            {exercise.difficulty}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2 mt-1">{exercise.description}</CardDescription>
        <div className="flex flex-wrap gap-1 mt-2">
          <Badge variant="outline" className="capitalize">{exercise.bodyPart}</Badge>
          {exercise.aiGenerated && <Badge variant="secondary">AI Generated</Badge>}
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow py-2">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="instructions" className="border-b-0">
            <AccordionTrigger className="py-2 text-sm hover:no-underline hover:text-primary">
              <span className="underline underline-offset-4">Instructions</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="whitespace-pre-wrap text-sm">{exercise.instructions}</div>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="details" className="border-b-0">
            <AccordionTrigger className="py-2 text-sm hover:no-underline hover:text-primary">
              <span className="underline underline-offset-4">Target Muscles</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="whitespace-pre-wrap text-sm">{exercise.targetMuscles}</div>
            </AccordionContent>
          </AccordionItem>
          
          {exercise.precautions && (
            <AccordionItem value="precautions" className="border-b-0">
              <AccordionTrigger className="py-2 text-sm hover:no-underline hover:text-primary">
                <span className="underline underline-offset-4">Precautions</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="whitespace-pre-wrap text-sm">{exercise.precautions}</div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
      
      <CardFooter className="flex flex-col items-start border-t pt-3 pb-3">
        <div className="flex flex-wrap w-full gap-3 text-xs">
          {exercise.repetitions && (
            <div className="bg-muted rounded-md px-2 py-1 flex items-center">
              <span className="font-medium mr-1">Reps:</span>
              <span>{exercise.repetitions}</span>
            </div>
          )}
          {exercise.sets && (
            <div className="bg-muted rounded-md px-2 py-1 flex items-center">
              <span className="font-medium mr-1">Sets:</span>
              <span>{exercise.sets}</span>
            </div>
          )}
          {exercise.duration && (
            <div className="bg-muted rounded-md px-2 py-1 flex items-center">
              <span className="font-medium mr-1">Duration:</span>
              <span>{exercise.duration}</span>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}