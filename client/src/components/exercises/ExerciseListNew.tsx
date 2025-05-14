import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Filter, Plus, Search } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  PaginationPrevious
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

// Default images for different body parts
const bodyPartImages: Record<string, string> = {
  shoulder: 'https://images.unsplash.com/photo-1590507621108-433608c97823?q=80&w=2070&auto=format&fit=crop',
  neck: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=2094&auto=format&fit=crop',
  back: 'https://images.unsplash.com/photo-1603287681836-b174ce5074c2?q=80&w=2071&auto=format&fit=crop',
  elbow: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?q=80&w=1974&auto=format&fit=crop',
  wrist: 'https://images.unsplash.com/photo-1556139966-56c3df1ddc63?q=80&w=2070&auto=format&fit=crop',
  hand: 'https://images.unsplash.com/photo-1506374322094-6021fc3926f1?q=80&w=2070&auto=format&fit=crop',
  hip: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?q=80&w=2074&auto=format&fit=crop',
  knee: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?q=80&w=2069&auto=format&fit=crop',
  ankle: 'https://images.unsplash.com/photo-1603744229289-64bfc37c5dd8?q=80&w=2070&auto=format&fit=crop',
  foot: 'https://images.unsplash.com/photo-1508387027939-27cccde53673?q=80&w=2070&auto=format&fit=crop',
  general: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=2070&auto=format&fit=crop'
};

// Exercise card component
function ExerciseCard({ exercise }: { exercise: Exercise }) {
  // Get default image URL based on body part
  const getImageUrl = () => {
    if (exercise.imageUrl) return exercise.imageUrl;
    return bodyPartImages[exercise.bodyPart] || bodyPartImages.general;
  };

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
      
      {/* Image Display - Always show an image (either custom or default) */}
      <div className="px-6 pb-2">
        <div className="relative w-full h-48 overflow-hidden rounded-md bg-muted">
          <img 
            src={getImageUrl()} 
            alt={`${exercise.title} exercise`} 
            className="object-cover w-full h-full"
            onError={(e) => {
              // If custom image fails, try to fallback to default
              const target = e.target as HTMLImageElement;
              if (target.src !== bodyPartImages[exercise.bodyPart] && bodyPartImages[exercise.bodyPart]) {
                target.src = bodyPartImages[exercise.bodyPart];
              } else if (target.src !== bodyPartImages.general) {
                target.src = bodyPartImages.general;
              } else {
                // If all fallbacks fail, hide the image
                target.style.display = 'none';
              }
            }}
          />
        </div>
      </div>

      {/* Video Display */}
      {exercise.videoUrl && (
        <div className="px-6 pb-2">
          <div className="relative w-full h-48 overflow-hidden rounded-md bg-muted">
            <video
              src={exercise.videoUrl}
              controls
              className="object-cover w-full h-full"
              onError={(e) => {
                // Hide broken videos
                (e.target as HTMLVideoElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      )}
      
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
              {exercise.repetitions}
            </div>
          )}
          
          {exercise.sets && (
            <div className="bg-muted rounded-md px-2 py-1 flex items-center">
              <span className="font-medium mr-1">Sets:</span>
              {exercise.sets}
            </div>
          )}
          
          {exercise.duration && (
            <div className="bg-muted rounded-md px-2 py-1 flex items-center">
              <span className="font-medium mr-1">Duration:</span>
              {exercise.duration}
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
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
  
  // Fetch all exercises for search functionality
  const { data: allExercises, isLoading: allExercisesLoading } = useQuery<Exercise[]>({
    queryKey: ['/api/exercises', 'all'],
    queryFn: async () => {
      return fetch('/api/exercises?all=true').then(res => {
        if (!res.ok) throw new Error('Failed to fetch all exercises');
        return res.json();
      });
    },
    enabled: isSearching || searchQuery.length > 2
  });
  
  // Search function
  const searchResults = React.useMemo(() => {
    if (!searchQuery || searchQuery.length < 3 || !allExercises) return null;
    
    const query = searchQuery.toLowerCase();
    return allExercises.filter(exercise => {
      return (
        exercise.title.toLowerCase().includes(query) ||
        exercise.description.toLowerCase().includes(query) ||
        exercise.instructions.toLowerCase().includes(query) ||
        (exercise.targetMuscles && exercise.targetMuscles.toLowerCase().includes(query)) ||
        (exercise.precautions && exercise.precautions.toLowerCase().includes(query))
      );
    });
  }, [searchQuery, allExercises]);
  
  // Filter exercises by tab (only when not searching)
  const filteredExercises = searchResults || exercises?.filter(exercise => {
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
          {/* Search Bar */}
          <div className="relative w-full md:w-64 mr-2">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              type="search"
              placeholder="Search exercises..."
              className="pl-10 w-full"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page when searching
                if (e.target.value.length > 2) {
                  setIsSearching(true);
                } else {
                  setIsSearching(false);
                }
              }}
            />
          </div>
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
      
      {searchQuery && searchQuery.length > 2 ? (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">
            {searchResults && searchResults.length > 0 
              ? `Search results for "${searchQuery}"`
              : `No results found for "${searchQuery}"`}
          </h2>
          {searchResults && searchResults.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {currentExercises?.map((exercise) => (
                <div key={exercise.id} className="relative">
                  <div className="absolute -top-2 -right-2 z-10">
                    <Badge className="capitalize">{exercise.bodyPart}</Badge>
                  </div>
                  <ExerciseCard exercise={exercise} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
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
                  ))}
                </div>
              </>
            ) : (
              <p className="text-center py-10 text-muted-foreground">No exercises found for the selected filters.</p>
            )}
          </TabsContent>
        </Tabs>
      )}
      
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
            
            {/* Display limited page numbers */}
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
      
      {totalExercises > 0 && totalExercises < 5 && activeTab !== 'all' && (
        <div className="mt-8 bg-muted p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Need more exercises?</h3>
          <p className="text-muted-foreground mb-4">Generate more exercises for this body part and expand your library.</p>
          {user ? (
            <Button onClick={() => handleGenerateExercises(activeTab, '', 3)}>
              Generate More {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Exercises
            </Button>
          ) : (
            <Button onClick={() => navigate('/auth')}>
              Log in to generate exercises
            </Button>
          )}
        </div>
      )}
    </div>
  );
}