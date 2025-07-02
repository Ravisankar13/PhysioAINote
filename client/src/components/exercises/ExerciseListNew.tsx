import React, { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Filter,
  Plus,
  Search,
  Download,
  Trash,
  Check,
  BookmarkPlus,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { jsPDF } from "jspdf";
import { useLocation } from "wouter";

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

// High-quality exercise demonstration photos
const specificExerciseImages: Record<string, string> = {
  // Shoulder exercises
  "shoulder press": "https://cdn.muscleandstrength.com/sites/default/files/dumbbell-shoulder-press.jpg",
  "overhead press": "https://cdn.muscleandstrength.com/sites/default/files/standing-overhead-press.jpg",
  "lateral raise": "https://cdn.muscleandstrength.com/sites/default/files/dumbbell-lateral-raise.jpg",
  "front raise": "https://cdn.muscleandstrength.com/sites/default/files/dumbbell-front-raise.jpg",
  "rear delt": "https://cdn.muscleandstrength.com/sites/default/files/reverse-dumbbell-fly.jpg",
  "shrug": "https://cdn.muscleandstrength.com/sites/default/files/dumbbell-shrug.jpg",
  "rotator cuff": "https://www.athletico.com/wp-content/uploads/2019/07/External-Rotation-with-Resistance-Band.jpg",
  "external rotation": "https://www.athletico.com/wp-content/uploads/2019/07/External-Rotation-with-Resistance-Band.jpg",
  "internal rotation": "https://i.pinimg.com/originals/8f/3d/49/8f3d49a6d8b8c0e8a5c7e1f3b2a4c6d8.jpg",
  "face pull": "https://cdn.muscleandstrength.com/sites/default/files/face-pull.jpg",
  "upright row": "https://cdn.muscleandstrength.com/sites/default/files/barbell-upright-row.jpg",

  // Neck exercises  
  "neck rotation": "https://www.verywellhealth.com/thmb/zJdKzMhQrLcP4vE6sJd7v9Qr2CY=/1500x844/smart/filters:no_upscale()/neck-rotation-exercise-GettyImages-1169394821-5c8b8c8a46e0fb00013c3c78.jpg",
  "neck flexion": "https://www.verywellhealth.com/thmb/1yMqX4Kz7kLcVzE8g5u2bJc6M5E=/1500x1000/smart/filters:no_upscale()/neck-flexion-GettyImages-1169394821-5c8b8c8a46e0fb00013c3c78.jpg",
  "neck extension": "https://www.verywellhealth.com/thmb/P9kL5r6xQgF4xJ2z8Nd3sM7Jk1Y=/1500x1000/smart/filters:no_upscale()/neck-extension-GettyImages-1169394821-5c8b8c8a46e0fb00013c3c78.jpg",
  "chin tuck": "https://i.pinimg.com/originals/4e/2a/18/4e2a18d5c3f7b8a9e1d4c6f2b5a8e7c9.jpg",

  // Back exercises
  "pull-up": "https://cdn.muscleandstrength.com/sites/default/files/pull-up.jpg",
  "lat pulldown": "https://cdn.muscleandstrength.com/sites/default/files/lat-pulldown.jpg",
  "seated row": "https://cdn.muscleandstrength.com/sites/default/files/seated-cable-row.jpg",
  "bent over row": "https://cdn.muscleandstrength.com/sites/default/files/barbell-bent-over-row.jpg",
  "deadlift": "https://cdn.muscleandstrength.com/sites/default/files/conventional-deadlift.jpg",
  "superman": "https://i.pinimg.com/originals/6c/9d/8e/6c9d8e7a5b4c3f2e1d8a9c6b5f4e3d2c.jpg",
  "bird dog": "https://i.pinimg.com/originals/7d/ae/9f/7dae9f8b6c5d4e3f2a1b9c8d7e6f5a4b.jpg",
  "cat cow": "https://i.pinimg.com/originals/8e/bf/a0/8ebfa09c7d6e5f4b3c2d1a0b9c8e7f6d.jpg",
  "mckenzie press up": "https://i.pinimg.com/originals/9f/c0/b1/9fc0b1ad8e7f6c5d4b3a2c1d0e9f8a7b.jpg",
  "good morning": "https://cdn.muscleandstrength.com/sites/default/files/barbell-good-morning.jpg",

  // Elbow/Arm exercises
  "bicep curl": "https://cdn.muscleandstrength.com/sites/default/files/dumbbell-bicep-curl.jpg",
  "hammer curl": "https://cdn.muscleandstrength.com/sites/default/files/dumbbell-hammer-curl.jpg",
  "tricep extension": "https://cdn.muscleandstrength.com/sites/default/files/overhead-tricep-extension.jpg",
  "skull crusher": "https://cdn.muscleandstrength.com/sites/default/files/lying-tricep-extension.jpg",
  "close grip bench press": "https://cdn.muscleandstrength.com/sites/default/files/close-grip-bench-press.jpg",
  "wrist curl": "https://cdn.muscleandstrength.com/sites/default/files/barbell-wrist-curl.jpg",
  "reverse wrist curl": "https://cdn.muscleandstrength.com/sites/default/files/reverse-barbell-wrist-curl.jpg",
  "pronation": "https://i.pinimg.com/originals/a1/d2/e3/a1d2e3f4c5b6a7d8e9f0a1b2c3d4e5f6.jpg",
  "supination": "https://i.pinimg.com/originals/b2/e3/f4/b2e3f4c5d6a7b8c9d0e1f2a3b4c5d6e7.jpg",

  // Hip exercises
  "squat": "https://cdn.muscleandstrength.com/sites/default/files/bodyweight-squat.jpg",
  "hip thrust": "https://cdn.muscleandstrength.com/sites/default/files/barbell-hip-thrust.jpg",
  "hip extension": "https://cdn.muscleandstrength.com/sites/default/files/hip-extension.jpg",
  "glute bridge": "https://i.pinimg.com/originals/c3/f4/d5/c3f4d5e6a7b8c9d0e1f2a3b4c5d6e7f8.jpg",
  "clam": "https://i.pinimg.com/originals/d4/e5/f6/d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9.jpg",
  "glute clam": "https://i.pinimg.com/originals/d4/e5/f6/d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9.jpg",
  "side-lying hip abduction": "https://i.pinimg.com/originals/e5/f6/a7/e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9ba.jpg",
  "leg raise": "https://cdn.muscleandstrength.com/sites/default/files/hanging-leg-raise.jpg",
  "dead bug": "https://i.pinimg.com/originals/f6/a7/b8/f6a7b8c9d0e1f2a3b4c5d6e7f8a9bacb.jpg",
  "fire hydrant": "https://i.pinimg.com/originals/a7/b8/c9/a7b8c9d0e1f2a3b4c5d6e7f8a9bacbdc.jpg",
  "donkey kick": "https://i.pinimg.com/originals/b8/c9/da/b8c9dae1f2a3b4c5d6e7f8a9bacbdced.jpg",
  "hip flexor stretch": "https://i.pinimg.com/originals/c9/da/eb/c9daebf2a3b4c5d6e7f8a9bacbdcedfe.jpg",
  "pigeon pose": "https://i.pinimg.com/originals/da/eb/fc/daebfca3b4c5d6e7f8a9bacbdcedfead.jpg",

  // Knee exercises
  "leg extension": "https://cdn.muscleandstrength.com/sites/default/files/leg-extension.jpg",
  "leg curl": "https://cdn.muscleandstrength.com/sites/default/files/lying-leg-curl.jpg",
  "lunge": "https://cdn.muscleandstrength.com/sites/default/files/dumbbell-lunge.jpg",
  "step up": "https://i.pinimg.com/originals/eb/fc/ad/ebfcadb4c5d6e7f8a9bacbdcedfea1be.jpg",
  "terminal knee extension": "https://i.pinimg.com/originals/fc/ad/be/fcadbec5d6e7f8a9bacbdcedfea1bec2.jpg",
  "wall slide": "https://i.pinimg.com/originals/ad/be/cf/adbecfd6e7f8a9bacbdcedfea1bec2df.jpg",
  "leg press": "https://cdn.muscleandstrength.com/sites/default/files/leg-press.jpg",
  "bulgarian split squat": "https://cdn.muscleandstrength.com/sites/default/files/bulgarian-split-squat.jpg",
  "quad stretch": "https://i.pinimg.com/originals/be/cf/da/becfdae7f8a9bacbdcedfea1bec2dfa3.jpg",

  // Ankle exercises
  "ankle alphabet": "https://i.pinimg.com/originals/cf/da/eb/cfdaebf8a9bacbdcedfea1bec2dfa3e4.jpg",
  "ankle circles": "https://i.pinimg.com/originals/da/eb/fc/daebfca9bacbdcedfea1bec2dfa3e4f5.jpg",
  "ankle dorsiflexion": "https://i.pinimg.com/originals/eb/fc/ad/ebfcadbacbdcedfea1bec2dfa3e4f5a6.jpg",
  "ankle plantarflexion": "https://cdn.muscleandstrength.com/sites/default/files/standing-calf-raise.jpg",
  "calf raise": "https://cdn.muscleandstrength.com/sites/default/files/standing-calf-raise.jpg",
  "heel drop": "https://i.pinimg.com/originals/fc/ad/be/fcadbecbdcedfea1bec2dfa3e4f5a6b7.jpg",
  "heel raise": "https://cdn.muscleandstrength.com/sites/default/files/standing-calf-raise.jpg",
  "ankle inversion": "https://i.pinimg.com/originals/ad/be/cf/adbecfcedfea1bec2dfa3e4f5a6b7c8d9.jpg",
  "ankle eversion": "https://i.pinimg.com/originals/be/cf/da/becfdaedfea1bec2dfa3e4f5a6b7c8d9ea.jpg",

  // Foot exercises
  "toe curl": "https://i.pinimg.com/originals/cf/da/eb/cfdaebfea1bec2dfa3e4f5a6b7c8d9eafb.jpg",
  "toe spread": "https://i.pinimg.com/originals/da/eb/fc/daebfca1bec2dfa3e4f5a6b7c8d9eafb0c.jpg",
  "towel scrunch": "https://i.pinimg.com/originals/eb/fc/ad/ebfcadc2dfa3e4f5a6b7c8d9eafb0c1d.jpg",
  "marble pickup": "https://i.pinimg.com/originals/fc/ad/be/fcadbea3e4f5a6b7c8d9eafb0c1d2e3f.jpg",
  "short foot exercise": "https://i.pinimg.com/originals/ad/be/cf/adbecfe4f5a6b7c8d9eafb0c1d2e3f40.jpg",

  // Core exercises
  "plank": "https://cdn.muscleandstrength.com/sites/default/files/plank.jpg",
  "side plank": "https://cdn.muscleandstrength.com/sites/default/files/side-plank.jpg",
  "push-up": "https://cdn.muscleandstrength.com/sites/default/files/push-up.jpg",
  "bench press": "https://cdn.muscleandstrength.com/sites/default/files/barbell-bench-press.jpg",
  "mountain climber": "https://i.pinimg.com/originals/be/cf/da/becfdaf5a6b7c8d9eafb0c1d2e3f4051.jpg",
  "burpee": "https://i.pinimg.com/originals/cf/da/eb/cfdaeba6b7c8d9eafb0c1d2e3f405162.jpg",
  "crunch": "https://cdn.muscleandstrength.com/sites/default/files/crunch.jpg",
  "sit-up": "https://cdn.muscleandstrength.com/sites/default/files/sit-up.jpg",
  "jumping jack": "https://i.pinimg.com/originals/da/eb/fc/daebfcb7c8d9eafb0c1d2e3f405162e73.jpg",
  "jumping rope": "https://i.pinimg.com/originals/eb/fc/ad/ebfcadc8d9eafb0c1d2e3f405162e7384.jpg",
  "russian twist": "https://cdn.muscleandstrength.com/sites/default/files/russian-twist.jpg",
  "high knees": "https://i.pinimg.com/originals/fc/ad/be/fcadbeeafb0c1d2e3f405162e7384a95.jpg",

  // Default fallback for exercises without specific images
  "default": "https://cdn.muscleandstrength.com/sites/default/files/bodyweight-squat.jpg"
};

// Body part default exercise photos
const bodyPartImages: Record<string, string> = {
  shoulder: specificExerciseImages["shoulder press"],
  neck: "https://www.verywellhealth.com/thmb/zJdKzMhQrLcP4vE6sJd7v9Qr2CY=/1500x844/smart/filters:no_upscale()/neck-rotation-exercise-GettyImages-1169394821-5c8b8c8a46e0fb00013c3c78.jpg",
  back: specificExerciseImages["pull-up"],
  elbow: specificExerciseImages["bicep curl"],
  wrist: "https://cdn.muscleandstrength.com/sites/default/files/barbell-wrist-curl.jpg",
  hand: "https://www.healthline.com/hlcmsresource/images/topic_centers/2019-6/hand-finger-exercises-1296x728-header.jpg",
  hip: specificExerciseImages["hip thrust"],
  knee: specificExerciseImages["leg extension"],
  ankle: specificExerciseImages["calf raise"],
  foot: "https://www.healthline.com/hlcmsresource/images/topic_centers/2019-6/foot-exercises-1296x728-header.jpg",
  general: specificExerciseImages["default"]
};

// Exercise card component
function ExerciseCard({
  exercise,
  isSelected = false,
  onToggleSelect,
}: {
  exercise: Exercise;
  isSelected?: boolean;
  onToggleSelect?: (exercise: Exercise) => void;
}) {
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
    let bestMatch = "";
    let bestScore = 0;

    // Find a specific exercise image by looking for keywords in all the text
    for (const [keyword, imageUrl] of Object.entries(specificExerciseImages)) {
      // Title match is highest priority
      if (title.includes(keyword)) {
        return imageUrl; // Immediate match if keyword is in title
      }

      // Check how many times the keyword appears in all text
      const matches = (allText?.match(new RegExp(keyword, "g")) || []).length;
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

  const handleSelectClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleSelect) {
      onToggleSelect(exercise);
    }
  };

  return (
    <Card
      className={`h-full flex flex-col hover:shadow-md transition-shadow duration-300 ${
        isSelected ? "border-primary border-2" : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-start gap-2 flex-1">
            {onToggleSelect && (
              <Button
                variant={isSelected ? "default" : "outline"}
                size="icon"
                className="h-7 w-7 rounded-full flex-shrink-0 mt-0.5"
                onClick={handleSelectClick}
              >
                {isSelected ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <BookmarkPlus className="h-4 w-4" />
                )}
              </Button>
            )}
            <CardTitle className="text-lg line-clamp-2">
              {exercise.title}
            </CardTitle>
          </div>
          <Badge
            variant={
              exercise.difficulty === "beginner"
                ? "outline"
                : exercise.difficulty === "intermediate"
                ? "secondary"
                : "default"
            }
            className="whitespace-nowrap"
          >
            {exercise.difficulty}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2 mt-1">
          {exercise.description}
        </CardDescription>
        <div className="flex flex-wrap gap-1 mt-2">
          <Badge variant="outline" className="capitalize">
            {exercise.bodyPart}
          </Badge>
          {exercise.aiGenerated && (
            <Badge variant="secondary">AI Generated</Badge>
          )}
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
              if (
                target.src !== bodyPartImages[exercise.bodyPart] &&
                bodyPartImages[exercise.bodyPart]
              ) {
                target.src = bodyPartImages[exercise.bodyPart];
              } else if (target.src !== bodyPartImages.general) {
                target.src = bodyPartImages.general;
              } else {
                // If all fallbacks fail, hide the image
                target.style.display = "none";
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
                (e.target as HTMLVideoElement).style.display = "none";
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
              <div className="whitespace-pre-wrap text-sm">
                {exercise.instructions}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="details" className="border-b-0">
            <AccordionTrigger className="py-2 text-sm hover:no-underline hover:text-primary">
              <span className="underline underline-offset-4">
                Target Muscles
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="whitespace-pre-wrap text-sm">
                {exercise.targetMuscles}
              </div>
            </AccordionContent>
          </AccordionItem>

          {exercise.precautions && (
            <AccordionItem value="precautions" className="border-b-0">
              <AccordionTrigger className="py-2 text-sm hover:no-underline hover:text-primary">
                <span className="underline underline-offset-4">
                  Precautions
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="whitespace-pre-wrap text-sm">
                  {exercise.precautions}
                </div>
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
  // State for exercise program
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [programName, setProgramName] = useState("My Exercise Program");
  const [isProgramSheetOpen, setIsProgramSheetOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // State for filters
  const [bodyPart, setBodyPart] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const exercisesPerPage = 6; // Number of exercises per page

  // Fetch exercises with filters
  const {
    data: exercises,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Exercise[]>({
    queryKey: ["/api/exercises", bodyPart, difficulty],
    queryFn: async () => {
      let url = "/api/exercises";

      // Add query parameters if filters are set
      const params = new URLSearchParams();
      if (bodyPart) params.append("bodyPart", bodyPart);
      if (difficulty) params.append("difficulty", difficulty);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      return fetch(url).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch exercises");
        return res.json();
      });
    },
  });

  // Fetch all exercises for search functionality
  const { data: allExercises, isLoading: allExercisesLoading } = useQuery<
    Exercise[]
  >({
    queryKey: ["/api/exercises", "all"],
    queryFn: async () => {
      return fetch("/api/exercises?all=true").then((res) => {
        if (!res.ok) throw new Error("Failed to fetch all exercises");
        return res.json();
      });
    },
    enabled: isSearching || searchQuery.length > 2,
  });

  // Search function
  const searchResults = React.useMemo(() => {
    if (!searchQuery || searchQuery.length < 3 || !allExercises) return null;

    const query = searchQuery.toLowerCase();
    return allExercises.filter((exercise) => {
      return (
        exercise.title.toLowerCase().includes(query) ||
        exercise.description.toLowerCase().includes(query) ||
        exercise.instructions.toLowerCase().includes(query) ||
        (exercise.targetMuscles &&
          exercise.targetMuscles.toLowerCase().includes(query)) ||
        (exercise.precautions &&
          exercise.precautions.toLowerCase().includes(query))
      );
    });
  }, [searchQuery, allExercises]);

  // Filter exercises by tab (only when not searching)
  const filteredExercises =
    searchResults ||
    exercises?.filter((exercise) => {
      if (activeTab === "all") return true;
      return exercise.bodyPart === activeTab;
    });

  // Calculate pagination
  const totalExercises = filteredExercises?.length || 0;
  const totalPages = Math.ceil(totalExercises / exercisesPerPage);

  // Get current page exercises
  const currentExercises = filteredExercises
    ? filteredExercises.slice(
        (currentPage - 1) * exercisesPerPage,
        currentPage * exercisesPerPage
      )
    : [];

  // Handle exercise generation
  // Handle exercise selection
  const handleToggleSelect = (exercise: Exercise) => {
    setSelectedExercises((prev) => {
      const isSelected = prev.some((ex) => ex.id === exercise.id);
      if (isSelected) {
        return prev.filter((ex) => ex.id !== exercise.id);
      } else {
        return [...prev, exercise];
      }
    });
  };

  // Check if an exercise is selected
  const isExerciseSelected = (exercise: Exercise) => {
    return selectedExercises.some((ex) => ex.id === exercise.id);
  };

  // Clear all selected exercises
  const clearSelectedExercises = () => {
    setSelectedExercises([]);
  };

  // Generate PDF for the exercise program
  const generatePDF = () => {
    if (selectedExercises.length === 0) {
      toast({
        title: "No exercises selected",
        description: "Please select at least one exercise to create a program.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Add program title
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text(programName, 105, 20, { align: "center" });

      // Add date
      doc.setFontSize(10);
      doc.text(`Created: ${new Date().toLocaleDateString()}`, 105, 30, {
        align: "center",
      });

      // Add exercises
      doc.setFontSize(12);
      let y = 45;

      selectedExercises.forEach((exercise, index) => {
        // If we're about to go off the page, add a new page
        if (y > 260) {
          doc.addPage();
          y = 20;
        }

        // Add exercise title
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 150);
        doc.text(`${index + 1}. ${exercise.title}`, 20, y);
        y += 8;

        // Add body part and difficulty
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Body Part: ${exercise.bodyPart} | Difficulty: ${exercise.difficulty}`,
          20,
          y
        );
        y += 6;

        // Add description
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        const splitDescription = doc.splitTextToSize(exercise.description, 170);
        doc.text(splitDescription, 20, y);
        y += splitDescription.length * 5 + 4;

        // Add instructions
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text("Instructions:", 20, y);
        y += 5;

        const splitInstructions = doc.splitTextToSize(
          exercise.instructions,
          170
        );
        doc.text(splitInstructions, 25, y);
        y += splitInstructions.length * 5 + 4;

        // Add reps/sets/duration if available
        let repInfo = "";
        if (exercise.repetitions) repInfo += `Reps: ${exercise.repetitions} `;
        if (exercise.sets) repInfo += `Sets: ${exercise.sets} `;
        if (exercise.duration) repInfo += `Duration: ${exercise.duration}`;

        if (repInfo) {
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.text(repInfo, 20, y);
          y += 5;
        }

        // Add space between exercises
        y += 8;
      });

      // Save the PDF
      doc.save(`${programName.replace(/\s+/g, "_")}.pdf`);

      toast({
        title: "PDF Generated",
        description: "Your exercise program has been downloaded as a PDF.",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
      setIsProgramSheetOpen(false);
    }
  };

  const handleGenerateExercises = async (
    bodyPart: string,
    difficulty: string,
    count: number = 3
  ) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "You need to be logged in to generate exercises.",
        variant: "destructive",
      });
      setLocation("/auth");
      return;
    }

    try {
      const response = await fetch("/api/exercises/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bodyPart, difficulty, count }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate exercises");
      }

      const generatedExercises = await response.json();

      toast({
        title: "Exercises Generated",
        description: `Successfully generated ${generatedExercises.length} new exercises.`,
      });

      // Refetch exercises to include newly generated ones
      refetch();

      // Set filters to match the generated exercises
      setBodyPart(bodyPart);
      setDifficulty(difficulty);
      setActiveTab(bodyPart);
    } catch (error) {
      console.error("Error generating exercises:", error);
      toast({
        title: "Generation Failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  // Reset filters
  const resetFilters = () => {
    setBodyPart("");
    setDifficulty("");
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
        <p className="text-destructive mb-4">
          Error loading exercises:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Exercise Library
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse evidence-based exercises for different body parts and
            difficulty levels
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

          {/* Program Creation */}
          <Sheet open={isProgramSheetOpen} onOpenChange={setIsProgramSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant={selectedExercises.length > 0 ? "default" : "outline"}
                className="gap-2"
                disabled={selectedExercises.length === 0}
              >
                <Download className="h-4 w-4" />
                Program ({selectedExercises.length})
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Create Exercise Program</SheetTitle>
                <SheetDescription>
                  Create a downloadable PDF with your selected exercises.
                </SheetDescription>
              </SheetHeader>

              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="program-name">Program Name</Label>
                  <Input
                    id="program-name"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    placeholder="My Exercise Program"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Selected Exercises ({selectedExercises.length})</Label>
                  <div className="border rounded-md p-2 max-h-[400px] overflow-y-auto">
                    {selectedExercises.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2 text-center">
                        No exercises selected. Select exercises from the library
                        first.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedExercises.map((exercise) => (
                          <div
                            key={exercise.id}
                            className="flex items-center justify-between p-2 border rounded-md"
                          >
                            <div>
                              <p className="font-medium">{exercise.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {exercise.bodyPart} | {exercise.difficulty}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleSelect(exercise)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <SheetFooter className="pt-2">
                <Button
                  onClick={generatePDF}
                  disabled={selectedExercises.length === 0 || isGeneratingPdf}
                  className="w-full"
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </>
                  )}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {/* Clear Selection Button */}
          {selectedExercises.length > 0 && (
            <Button
              variant="outline"
              size="icon"
              onClick={clearSelectedExercises}
              className="h-9 w-9 ml-2"
              title="Clear selection"
            >
              <Trash className="h-4 w-4" />
            </Button>
          )}

          {/* Filters */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2 ml-2">
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
                  <Select value={bodyPart} onValueChange={setBodyPart}>
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
                  <Select value={difficulty} onValueChange={setDifficulty}>
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
                <Button variant="outline" onClick={resetFilters}>
                  Reset
                </Button>
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
                    <Select value={bodyPart} onValueChange={setBodyPart}>
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
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger id="genDifficulty">
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">
                          Intermediate
                        </SelectItem>
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
                  <ExerciseCard
                    exercise={exercise}
                    isSelected={isExerciseSelected(exercise)}
                    onToggleSelect={handleToggleSelect}
                  />
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
          }}
        >
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
                    <ExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      isSelected={isExerciseSelected(exercise)}
                      onToggleSelect={handleToggleSelect}
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-center py-10 text-muted-foreground">
                No exercises found for the selected filters.
              </p>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <Pagination className="mt-8">
          <PaginationContent>
            <div className="hidden sm:flex items-center space-x-2 mr-2 text-sm text-muted-foreground">
              <span>
                Page {currentPage} of {totalPages}
              </span>
            </div>
            {currentPage > 1 && (
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                />
              </PaginationItem>
            )}

            {/* Display limited page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
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
                <PaginationNext
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}

      {totalExercises > 0 && totalExercises < 5 && activeTab !== "all" && (
        <div className="mt-8 bg-muted p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Need more exercises?</h3>
          <p className="text-muted-foreground mb-4">
            Generate more exercises for this body part and expand your library.
          </p>
          {user ? (
            <Button onClick={() => handleGenerateExercises(activeTab, "", 3)}>
              Generate More{" "}
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Exercises
            </Button>
          ) : (
            <Button onClick={() => setLocation("/auth")}>
              Log in to generate exercises
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
