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

// Specific exercise images for common exercises
const specificExerciseImages: Record<string, string> = {
  // Shoulder exercises
  'shoulder press': 'https://static.strengthlevel.com/images/illustrations/dumbbell-shoulder-press-1000x1000.jpg',
  'overhead press': 'https://static.strengthlevel.com/images/illustrations/dumbbell-shoulder-press-1000x1000.jpg',
  'lateral raise': 'https://static.strengthlevel.com/images/illustrations/dumbbell-lateral-raise-1000x1000.jpg',
  'front raise': 'https://static.strengthlevel.com/images/illustrations/dumbbell-front-raise-1000x1000.jpg',
  'rear delt': 'https://static.strengthlevel.com/images/illustrations/reverse-dumbbell-fly-1000x1000.jpg',
  'shrug': 'https://static.strengthlevel.com/images/illustrations/dumbbell-shrug-1000x1000.jpg',
  'rotator cuff': 'https://www.spotebi.com/wp-content/uploads/2015/02/rotator-cuff-exercise-illustration.jpg',
  'external rotation': 'https://www.spotebi.com/wp-content/uploads/2016/07/shoulder-external-rotation-exercise-illustration.jpg',
  'internal rotation': 'https://www.physiomed.co.uk/uploads/images/homepages/resist_band_rotation_home.jpg',
  'face pull': 'https://static.strengthlevel.com/images/illustrations/face-pull-1000x1000.jpg',
  'upright row': 'https://static.strengthlevel.com/images/illustrations/upright-row-1000x1000.jpg',
  
  // Neck exercises
  'neck rotation': 'https://www.spotebi.com/wp-content/uploads/2015/04/neck-rotation-exercise-illustration.jpg',
  'neck flexion': 'https://www.spotebi.com/wp-content/uploads/2015/03/neck-flexion-exercise-illustration.jpg',
  'neck extension': 'https://www.neckfit.com.au/wp-content/uploads/2021/11/neck-extension-exercise-illustration.jpg',
  'chin tuck': 'https://images.squarespace-cdn.com/content/v1/5c5f2b43e8ba447cacee3a00/1629149254553-7Z1AQZM4EZCXL7EUW4BL/Chin+Tuck.jpg',
  
  // Back exercises
  'pull-up': 'https://static.strengthlevel.com/images/illustrations/pull-ups-1000x1000.jpg',
  'lat pulldown': 'https://static.strengthlevel.com/images/illustrations/lat-pulldown-1000x1000.jpg',
  'seated row': 'https://static.strengthlevel.com/images/illustrations/seated-cable-row-1000x1000.jpg',
  'bent over row': 'https://static.strengthlevel.com/images/illustrations/bent-over-row-1000x1000.jpg',
  'deadlift': 'https://static.strengthlevel.com/images/illustrations/deadlift-1000x1000.jpg',
  'superman': 'https://www.spotebi.com/wp-content/uploads/2015/01/superman-exercise-illustration.jpg',
  'bird dog': 'https://www.spotebi.com/wp-content/uploads/2015/01/bird-dog-exercise-illustration.jpg',
  'cat cow': 'https://www.spotebi.com/wp-content/uploads/2015/05/cat-cow-exercise-illustration.jpg',
  'mckenzie press up': 'https://www.researchgate.net/profile/Stephen-Pheasant/publication/303864059/figure/fig2/AS:668749290856457@1536456321164/The-McKenzie-press-up-exercise-drawing-by-the-first-author.png',
  'good morning': 'https://static.strengthlevel.com/images/illustrations/good-morning-1000x1000.jpg',
  
  // Elbow exercises
  'bicep curl': 'https://static.strengthlevel.com/images/illustrations/dumbbell-curl-1000x1000.jpg',
  'hammer curl': 'https://static.strengthlevel.com/images/illustrations/hammer-curl-1000x1000.jpg',
  'tricep extension': 'https://static.strengthlevel.com/images/illustrations/cable-tricep-pushdown-1000x1000.jpg',
  'skull crusher': 'https://static.strengthlevel.com/images/illustrations/lying-tricep-extension-1000x1000.jpg',
  'close grip bench press': 'https://static.strengthlevel.com/images/illustrations/close-grip-bench-press-1000x1000.jpg',
  'wrist curl': 'https://static.strengthlevel.com/images/illustrations/wrist-curl-1000x1000.jpg',
  'reverse wrist curl': 'https://static.strengthlevel.com/images/illustrations/reverse-wrist-curl-1000x1000.jpg',
  'pronation': 'https://www.piesantyhealth.com/photos/shared/resisted-forearm-pronation.jpg',
  'supination': 'https://www.piesantyhealth.com/photos/shared/resisted-forearm-supination.jpg',
  
  // Hip exercises
  'squat': 'https://static.strengthlevel.com/images/illustrations/squat-1000x1000.jpg',
  'hip thrust': 'https://static.strengthlevel.com/images/illustrations/hip-thrust-1000x1000.jpg',
  'hip extension': 'https://static.strengthlevel.com/images/illustrations/hip-thrust-1000x1000.jpg',
  'glute bridge': 'https://www.spotebi.com/wp-content/uploads/2015/01/glute-bridge-exercise-illustration.jpg',
  'clam': 'https://www.spotebi.com/wp-content/uploads/2015/01/clams-exercise-illustration.jpg',
  'glute clam': 'https://www.spotebi.com/wp-content/uploads/2015/01/clams-exercise-illustration.jpg',
  'side-lying hip abduction': 'https://www.spotebi.com/wp-content/uploads/2015/01/side-lying-leg-raise-exercise-illustration.jpg',
  'leg raise': 'https://www.spotebi.com/wp-content/uploads/2015/01/side-lying-leg-raise-exercise-illustration.jpg',
  'dead bug': 'https://www.spotebi.com/wp-content/uploads/2016/06/dead-bug-exercise-illustration.jpg',
  'fire hydrant': 'https://www.spotebi.com/wp-content/uploads/2016/10/fire-hydrant-exercise-illustration.jpg',
  'donkey kick': 'https://www.spotebi.com/wp-content/uploads/2015/01/donkey-kicks-exercise-illustration.jpg',
  'hip flexor stretch': 'https://www.spotebi.com/wp-content/uploads/2015/02/hip-flexor-stretch-exercise-illustration.jpg',
  'pigeon pose': 'https://www.spotebi.com/wp-content/uploads/2015/02/pigeon-pose-exercise-illustration.jpg',
  
  // Knee exercises
  'leg extension': 'https://static.strengthlevel.com/images/illustrations/leg-extension-1000x1000.jpg',
  'leg curl': 'https://static.strengthlevel.com/images/illustrations/seated-leg-curl-1000x1000.jpg',
  'lunge': 'https://static.strengthlevel.com/images/illustrations/dumbbell-lunge-1000x1000.jpg',
  'step up': 'https://www.spotebi.com/wp-content/uploads/2015/03/step-up-exercise-illustration.jpg',
  'terminal knee extension': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQwGEzSMgTZOxaQBfgWz2_M6TExG95uZm5-ZQ&usqp=CAU',
  'wall slide': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIvJf3SH1h8Wqe-z5-_xzW1SbEh_ReSH5BGA&usqp=CAU',
  'leg press': 'https://static.strengthlevel.com/images/illustrations/leg-press-1000x1000.jpg',
  'bulgarian split squat': 'https://static.strengthlevel.com/images/illustrations/bulgarian-split-squat-1000x1000.jpg',
  'quad stretch': 'https://www.spotebi.com/wp-content/uploads/2015/02/quad-stretch-exercise-illustration.jpg',
  
  // Ankle exercises
  'ankle alphabet': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT77YW1QbUCQDGxtTdS9KK2wpHwajwKcCm9hg&usqp=CAU',
  'ankle circles': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT77YW1QbUCQDGxtTdS9KK2wpHwajwKcCm9hg&usqp=CAU',
  'ankle dorsiflexion': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQiIhC7aU99_SHyEgjAU3AcdO76vYQu96B4OA&usqp=CAU',
  'ankle plantarflexion': 'https://static.strengthlevel.com/images/illustrations/standing-calf-raise-1000x1000.jpg',
  'calf raise': 'https://static.strengthlevel.com/images/illustrations/standing-calf-raise-1000x1000.jpg',
  'heel drop': 'https://www.ankle-joint-pain.com/images/xheal-drop-exercise.jpg.pagespeed.ic.5_YQWqt7L_.jpg',
  'heel raise': 'https://static.strengthlevel.com/images/illustrations/standing-calf-raise-1000x1000.jpg',
  'ankle inversion': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTZTJPBxtRQjQEV6fhOEBtO-xRtDnA0hHNZPA&usqp=CAU',
  'ankle eversion': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT4OznNXBvd4m4PG1eo6BJa4eVhRkLuuJzYww&usqp=CAU',
  
  // Foot exercises
  'toe curl': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS-Cw2VDRQnqlMX0JVGtvPIbXw9a4LE0ASBGA&usqp=CAU',
  'toe spread': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQyxqDf9LULLCJulqnJeNVfRoQ6B6BI_1bZwQ&usqp=CAU',
  'towel scrunch': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTaPG_f9jF2SfK1q-Y1DzxFhJFBbhBVuF11KQ&usqp=CAU',
  'marble pickup': 'https://i.pinimg.com/originals/03/fa/44/03fa44e9b15307ee5ae0378cd6484ebe.jpg',
  'short foot exercise': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTxvg5lZB-y_c1J3YSUkLbEfuRY-jt4c1q_yQ&usqp=CAU',
  
  // General exercises
  'plank': 'https://static.strengthlevel.com/images/illustrations/plank-1000x1000.jpg',
  'side plank': 'https://static.strengthlevel.com/images/illustrations/side-plank-1000x1000.jpg',
  'push-up': 'https://static.strengthlevel.com/images/illustrations/push-ups-1000x1000.jpg',
  'bench press': 'https://static.strengthlevel.com/images/illustrations/bench-press-1000x1000.jpg',
  'mountain climber': 'https://www.spotebi.com/wp-content/uploads/2014/10/mountain-climbers-exercise-illustration.jpg',
  'burpee': 'https://www.spotebi.com/wp-content/uploads/2015/03/burpees-exercise-illustration.jpg',
  'crunch': 'https://static.strengthlevel.com/images/illustrations/crunch-1000x1000.jpg',
  'sit-up': 'https://static.strengthlevel.com/images/illustrations/sit-up-1000x1000.jpg',
  'jumping jack': 'https://www.spotebi.com/wp-content/uploads/2015/09/jumping-jacks-exercise-illustration.jpg',
  'jumping rope': 'https://www.spotebi.com/wp-content/uploads/2017/07/jump-rope-exercise-illustration.jpg',
  'russian twist': 'https://www.spotebi.com/wp-content/uploads/2016/10/russian-twist-exercise-illustration.jpg',
  'high knees': 'https://www.spotebi.com/wp-content/uploads/2014/10/high-knees-exercise-illustration.jpg',
};

// Default images for different body parts (used as fallback)
const bodyPartImages: Record<string, string> = {
  shoulder: 'https://static.strengthlevel.com/images/illustrations/dumbbell-shoulder-press-1000x1000.jpg',
  neck: 'https://www.spotebi.com/wp-content/uploads/2015/04/neck-rotation-exercise-illustration.jpg',
  back: 'https://static.strengthlevel.com/images/illustrations/lat-pulldown-1000x1000.jpg',
  elbow: 'https://static.strengthlevel.com/images/illustrations/dumbbell-curl-1000x1000.jpg',
  wrist: 'https://static.strengthlevel.com/images/illustrations/wrist-curl-1000x1000.jpg',
  hand: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSwBvpGJBirJgMXKPvNBaRXygfXm0qB0xIoAw&usqp=CAU',
  hip: 'https://static.strengthlevel.com/images/illustrations/hip-thrust-1000x1000.jpg',
  knee: 'https://static.strengthlevel.com/images/illustrations/leg-extension-1000x1000.jpg',
  ankle: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT77YW1QbUCQDGxtTdS9KK2wpHwajwKcCm9hg&usqp=CAU',
  foot: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS-Cw2VDRQnqlMX0JVGtvPIbXw9a4LE0ASBGA&usqp=CAU',
  general: 'https://static.strengthlevel.com/images/illustrations/push-ups-1000x1000.jpg'
};

// Exercise card component
function ExerciseCard({ exercise }: { exercise: Exercise }) {
  // Find the most appropriate image for the exercise
  const getImageUrl = () => {
    // Use custom image if available
    if (exercise.imageUrl) return exercise.imageUrl;
    
    // Convert title, description, and target muscles to lowercase for matching
    const title = exercise.title.toLowerCase();
    const description = exercise.description.toLowerCase();
    const targetMuscles = exercise.targetMuscles.toLowerCase();
    const instructions = exercise.instructions.toLowerCase();
    
    // Combine all text for comprehensive matching
    const allText = `${title} ${description} ${targetMuscles} ${instructions}`;
    
    // Create a scoring system for better matches
    let bestMatch = '';
    let bestScore = 0;
    
    // Find a specific exercise image by looking for keywords in all the text
    for (const [keyword, imageUrl] of Object.entries(specificExerciseImages)) {
      // Title match is highest priority
      if (title.includes(keyword)) {
        return imageUrl; // Immediate match if keyword is in title
      }
      
      // Check how many times the keyword appears in all text
      const matches = (allText.match(new RegExp(keyword, 'g')) || []).length;
      if (matches > bestScore) {
        bestScore = matches;
        bestMatch = imageUrl;
      }
    }
    
    // If we found any match in the combined text, use it
    if (bestMatch && bestScore > 0) {
      return bestMatch;
    }
    
    // Fall back to body part image if no specific exercise match
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