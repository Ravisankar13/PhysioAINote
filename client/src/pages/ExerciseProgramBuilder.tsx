import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, GripVertical, Edit, Trash2, Copy, Globe, Lock, Users, Dumbbell, Clock, Target, ChevronRight, X, Calendar, Save } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { ExerciseProgram, ProgramExercise } from "@shared/schema";

interface ExerciseProgramWithExercises extends ExerciseProgram {
  exercises: ProgramExercise[];
}

interface EditingExercise {
  id: number;
  sets: number;
  reps: string;
  restTime: number;
  day: number;
  notes: string;
}

export default function ExerciseProgramBuilder() {
  const [selectedProgram, setSelectedProgram] = useState<ExerciseProgramWithExercises | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBodyPart, setSelectedBodyPart] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState("");
  const [selectedTarget, setSelectedTarget] = useState("");
  const [isExerciseSearchOpen, setIsExerciseSearchOpen] = useState(false);
  const [hasSyncedExercises, setHasSyncedExercises] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [editingExercise, setEditingExercise] = useState<EditingExercise | null>(null);
  const [maxDays, setMaxDays] = useState(3); // Default to 3 day program

  // Fetch user's programs
  const { data: programs, isLoading: programsLoading } = useQuery({
    queryKey: ["/api/exercise-programs"],
  });

  // Fetch exercise filters (body parts, equipment, etc.)
  const { data: filters } = useQuery({
    queryKey: ["/api/exercises/filters"],
  });

  // Search cached exercises - simpler approach with manual fetching
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const searchExercises = async () => {
    setSearchLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedBodyPart && selectedBodyPart !== 'all') params.append('bodyPart', selectedBodyPart);
      if (selectedEquipment && selectedEquipment !== 'all') params.append('equipment', selectedEquipment);
      if (selectedTarget && selectedTarget !== 'all') params.append('target', selectedTarget);
      params.append('limit', '100');
      
      const response = await fetch(`/api/exercises/cached?${params.toString()}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Sync exercises from ExerciseDB API
  const syncExercisesMutation = useMutation({
    mutationFn: () => apiRequest("/api/exercises/sync", "POST", {}),
    onSuccess: (data) => {
      setHasSyncedExercises(true);
      queryClient.invalidateQueries({ queryKey: ["/api/exercises/cached"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exercises/filters"] });
      // Only show a brief message if truly synced new data
      if (data.newCount && data.newCount > 0) {
        toast({
          title: "Exercises Synced",
          description: `${data.newCount} new exercises added to database.`,
        });
      }
      searchExercises();
    },
    onError: () => {
      // Silently use existing database - no error toast
      setHasSyncedExercises(true);
      searchExercises();
    },
  });

  // Auto-sync exercises when dialog opens for the first time only
  useEffect(() => {
    if (isExerciseSearchOpen && !hasSyncedExercises) {
      syncExercisesMutation.mutate();
    }
  }, [isExerciseSearchOpen, hasSyncedExercises]);

  // Calculate max days from exercises when program is loaded
  useEffect(() => {
    if (selectedProgram?.exercises) {
      const maxDay = Math.max(...selectedProgram.exercises.map(e => e.day || 1), 3);
      setMaxDays(maxDay);
    }
  }, [selectedProgram]);

  // Create program mutation
  const createProgramMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/exercise-programs", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exercise-programs"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Exercise program created successfully",
      });
    },
  });

  // Update program mutation
  const updateProgramMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest(`/api/exercise-programs/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exercise-programs"] });
      toast({
        title: "Success",
        description: "Program updated successfully",
      });
    },
  });

  // Delete program mutation
  const deleteProgramMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/exercise-programs/${id}`, "DELETE", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exercise-programs"] });
      setSelectedProgram(null);
      toast({
        title: "Success",
        description: "Program deleted successfully",
      });
    },
  });

  // Add exercise mutation
  const addExerciseMutation = useMutation({
    mutationFn: ({ programId, exercise }: { programId: number; exercise: any }) =>
      apiRequest(`/api/exercise-programs/${programId}/exercises`, "POST", exercise),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/exercise-programs/${variables.programId}`] });
      // Refresh the current program
      if (selectedProgram) {
        fetchProgramDetails(selectedProgram.id);
      }
      toast({
        title: "Success",
        description: "Exercise added to program",
      });
    },
  });

  // Update exercise mutation  
  const updateExerciseMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest(`/api/program-exercises/${id}`, "PUT", data),
    onSuccess: () => {
      if (selectedProgram) {
        fetchProgramDetails(selectedProgram.id);
      }
      setEditingExercise(null);
      toast({
        title: "Success",
        description: "Exercise updated successfully",
      });
    },
  });

  // Remove exercise mutation
  const removeExerciseMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/program-exercises/${id}`, "DELETE", {}),
    onSuccess: () => {
      if (selectedProgram) {
        fetchProgramDetails(selectedProgram.id);
      }
      toast({
        title: "Success",
        description: "Exercise removed from program",
      });
    },
  });

  // Reorder exercises mutation
  const reorderExercisesMutation = useMutation({
    mutationFn: ({ programId, exerciseIds }: { programId: number; exerciseIds: number[] }) =>
      apiRequest(`/api/exercise-programs/${programId}/reorder`, "POST", { exerciseIds }),
  });

  // Fetch program details
  const fetchProgramDetails = async (programId: number) => {
    try {
      const response = await fetch(`/api/exercise-programs/${programId}`, {
        credentials: "include",
      });
      const data = await response.json();
      setSelectedProgram(data);
    } catch (error) {
      console.error("Error fetching program details:", error);
    }
  };

  // Handle drag and drop
  const handleDragEnd = (result: any) => {
    if (!result.destination || !selectedProgram) return;

    const items = Array.from(selectedProgram.exercises);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update local state optimistically
    setSelectedProgram({
      ...selectedProgram,
      exercises: items,
    });

    // Send update to server
    reorderExercisesMutation.mutate({
      programId: selectedProgram.id,
      exerciseIds: items.map(e => e.id),
    });
  };

  // Handle adding exercise from search results
  const handleAddExercise = (exercise: any) => {
    if (!selectedProgram) return;

    const newExercise = {
      externalId: exercise.id,
      apiSource: "exercisedb",
      name: exercise.name,
      equipment: exercise.equipment,
      bodyPart: exercise.bodyPart,
      target: exercise.target,
      gifUrl: exercise.gifUrl,
      instructions: exercise.instructions,
      orderIndex: selectedProgram.exercises.length,
      sets: 3,
      reps: "10-12",
      restTime: 60,
      day: selectedDay, // Use the selected day
    };

    addExerciseMutation.mutate({
      programId: selectedProgram.id,
      exercise: newExercise,
    });
  };

  // Start editing an exercise
  const startEditingExercise = (exercise: ProgramExercise) => {
    setEditingExercise({
      id: exercise.id,
      sets: exercise.sets || 3,
      reps: exercise.reps || "10-12",
      restTime: exercise.restTime || 60,
      day: exercise.day || 1,
      notes: exercise.notes || "",
    });
  };

  // Save exercise edits
  const saveExerciseEdits = () => {
    if (!editingExercise) return;

    updateExerciseMutation.mutate({
      id: editingExercise.id,
      data: {
        sets: editingExercise.sets,
        reps: editingExercise.reps,
        restTime: editingExercise.restTime,
        day: editingExercise.day,
        notes: editingExercise.notes,
      },
    });
  };

  // Group exercises by day
  const exercisesByDay = selectedProgram?.exercises?.reduce((acc, exercise) => {
    const day = exercise.day || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(exercise);
    return acc;
  }, {} as Record<number, ProgramExercise[]>) || {};

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Exercise Program Builder</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage custom exercise programs with animated demonstrations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setIsExerciseSearchOpen(true)}
          >
            <Search className="h-4 w-4 mr-2" />
            Browse Exercises
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Program
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Exercise Program</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const bodyPartValue = formData.get("bodyPart");
                createProgramMutation.mutate({
                  name: formData.get("name"),
                  description: formData.get("description"),
                  bodyPart: bodyPartValue === "none" ? null : bodyPartValue,
                  difficulty: formData.get("difficulty"),
                  duration: parseInt(formData.get("duration") as string) || 30,
                  frequency: formData.get("frequency"),
                  isPublic: formData.get("visibility") === "public",
                  goals: [],
                  tags: [],
                });
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="name">Program Name</Label>
                <Input id="name" name="name" required placeholder="e.g., Shoulder Rehabilitation" />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe the program goals and target audience"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bodyPart">Body Part</Label>
                  <Select name="bodyPart">
                    <SelectTrigger>
                      <SelectValue placeholder="Select body part" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="shoulder">Shoulder</SelectItem>
                      <SelectItem value="neck">Neck</SelectItem>
                      <SelectItem value="back">Back</SelectItem>
                      <SelectItem value="elbow">Elbow</SelectItem>
                      <SelectItem value="wrist">Wrist</SelectItem>
                      <SelectItem value="hip">Hip</SelectItem>
                      <SelectItem value="knee">Knee</SelectItem>
                      <SelectItem value="ankle">Ankle</SelectItem>
                      <SelectItem value="foot">Foot</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select name="difficulty">
                    <SelectTrigger>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input id="duration" name="duration" type="number" placeholder="30" />
                </div>
                <div>
                  <Label htmlFor="frequency">Frequency</Label>
                  <Input id="frequency" name="frequency" placeholder="e.g., 3x per week" />
                </div>
              </div>
              <div>
                <Label htmlFor="visibility">Visibility</Label>
                <Select name="visibility">
                  <SelectTrigger>
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                Create Program
              </Button>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Program List */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>My Programs</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {programsLoading ? (
                  <div className="text-center py-4">Loading programs...</div>
                ) : programs && programs.length > 0 ? (
                  <div className="space-y-2">
                    {programs.map((program: ExerciseProgram) => (
                      <Card
                        key={program.id}
                        className={`cursor-pointer transition-colors ${
                          selectedProgram?.id === program.id ? "bg-accent" : "hover:bg-accent/50"
                        }`}
                        onClick={() => fetchProgramDetails(program.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold">{program.name}</h3>
                              {program.bodyPart && (
                                <Badge variant="secondary" className="mt-1">
                                  {program.bodyPart}
                                </Badge>
                              )}
                              {program.difficulty && (
                                <Badge variant="outline" className="mt-1 ml-1">
                                  {program.difficulty}
                                </Badge>
                              )}
                            </div>
                            {program.isPublic ? (
                              <Globe className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Lock className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          {program.description && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {program.description}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No programs yet. Create your first program to get started.
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Program Details */}
        <div className="lg:col-span-2">
          {selectedProgram ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedProgram.name}</CardTitle>
                    {selectedProgram.description && (
                      <p className="text-muted-foreground mt-2">{selectedProgram.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedProgram.bodyPart && (
                        <Badge>{selectedProgram.bodyPart}</Badge>
                      )}
                      {selectedProgram.difficulty && (
                        <Badge variant="secondary">{selectedProgram.difficulty}</Badge>
                      )}
                      {selectedProgram.duration && (
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {selectedProgram.duration} min
                        </Badge>
                      )}
                      {selectedProgram.frequency && (
                        <Badge variant="outline">
                          <Target className="h-3 w-3 mr-1" />
                          {selectedProgram.frequency}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsExerciseSearchOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Exercise
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this program?")) {
                          deleteProgramMutation.mutate(selectedProgram.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Day selector */}
                <div className="mb-4 flex items-center gap-2">
                  <Label>Program Days:</Label>
                  <div className="flex gap-2">
                    {[...Array(maxDays)].map((_, i) => (
                      <Button
                        key={i + 1}
                        variant={selectedDay === i + 1 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedDay(i + 1)}
                      >
                        Day {i + 1}
                      </Button>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMaxDays(maxDays + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Tabs defaultValue="exercises">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="exercises">Exercises</TabsTrigger>
                    <TabsTrigger value="week-view">Week View</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>

                  <TabsContent value="exercises" className="mt-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Day {selectedDay} Exercises
                    </h3>
                    {exercisesByDay[selectedDay] && exercisesByDay[selectedDay].length > 0 ? (
                      <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="exercises">
                          {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                              {exercisesByDay[selectedDay].map((exercise, index) => (
                                <Draggable key={exercise.id} draggableId={exercise.id.toString()} index={index}>
                                  {(provided, snapshot) => (
                                    <Card
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={`${snapshot.isDragging ? "shadow-lg" : ""}`}
                                    >
                                      <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                          <div {...provided.dragHandleProps} className="mt-1">
                                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                                          </div>
                                          <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                              <div className="flex-1">
                                                <h4 className="font-semibold">{exercise.name}</h4>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                  {exercise.bodyPart && (
                                                    <Badge variant="secondary" className="text-xs">
                                                      {exercise.bodyPart}
                                                    </Badge>
                                                  )}
                                                  {exercise.target && (
                                                    <Badge variant="outline" className="text-xs">
                                                      {exercise.target}
                                                    </Badge>
                                                  )}
                                                  {exercise.equipment && (
                                                    <Badge variant="outline" className="text-xs">
                                                      {exercise.equipment}
                                                    </Badge>
                                                  )}
                                                </div>
                                                
                                                {/* Exercise Details - Inline Display */}
                                                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                                                  <div className="flex items-center gap-1">
                                                    <span className="font-medium">Sets:</span>
                                                    <span>{exercise.sets || 3}</span>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    <span className="font-medium">Reps:</span>
                                                    <span>{exercise.reps || "10-12"}</span>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    <span className="font-medium">Rest:</span>
                                                    <span>{exercise.restTime || 60}s</span>
                                                  </div>
                                                </div>
                                                
                                                {exercise.notes && (
                                                  <p className="text-sm text-muted-foreground mt-2">
                                                    {exercise.notes}
                                                  </p>
                                                )}
                                              </div>
                                              <div className="flex gap-1">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => startEditingExercise(exercise)}
                                                >
                                                  <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => removeExerciseMutation.mutate(exercise.id)}
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No exercises for Day {selectedDay}. Add exercises to get started.
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="week-view" className="mt-4">
                    <div className="space-y-4">
                      {[...Array(maxDays)].map((_, dayIndex) => {
                        const day = dayIndex + 1;
                        const dayExercises = exercisesByDay[day] || [];
                        return (
                          <Card key={day}>
                            <CardHeader className="pb-3">
                              <h3 className="font-semibold flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Day {day}
                                <Badge variant="secondary" className="ml-2">
                                  {dayExercises.length} exercises
                                </Badge>
                              </h3>
                            </CardHeader>
                            <CardContent>
                              {dayExercises.length > 0 ? (
                                <div className="space-y-2">
                                  {dayExercises.map((exercise) => (
                                    <div key={exercise.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                      <div>
                                        <span className="font-medium">{exercise.name}</span>
                                        <span className="text-sm text-muted-foreground ml-2">
                                          {exercise.sets || 3} x {exercise.reps || "10-12"}
                                        </span>
                                      </div>
                                      <div className="flex gap-2">
                                        {exercise.bodyPart && (
                                          <Badge variant="outline" className="text-xs">
                                            {exercise.bodyPart}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">Rest day or no exercises assigned</p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </TabsContent>

                  <TabsContent value="preview" className="mt-4">
                    <div className="space-y-4">
                      <h3 className="font-semibold">Program Overview</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Total Days</span>
                            </div>
                            <p className="text-2xl font-bold mt-2">{maxDays}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <Dumbbell className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Total Exercises</span>
                            </div>
                            <p className="text-2xl font-bold mt-2">
                              {selectedProgram.exercises?.length || 0}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                      
                      {/* Exercise Distribution */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Exercise Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {Object.entries(exercisesByDay).map(([day, exercises]) => (
                              <div key={day} className="flex items-center justify-between">
                                <span className="text-sm">Day {day}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-32 bg-muted rounded-full h-2">
                                    <div
                                      className="bg-primary rounded-full h-2"
                                      style={{ width: `${(exercises.length / (selectedProgram.exercises?.length || 1)) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-sm text-muted-foreground">{exercises.length}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Program Selected</h3>
                <p className="text-muted-foreground text-center">
                  Select a program from the list or create a new one to get started
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Exercise Search Dialog */}
      <Dialog open={isExerciseSearchOpen} onOpenChange={setIsExerciseSearchOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Browse Exercise Database</DialogTitle>
          </DialogHeader>
          
          {selectedProgram && (
            <div className="mb-4 p-3 bg-accent rounded-lg">
              <p className="text-sm font-medium">
                Adding exercises to: <span className="font-bold">{selectedProgram.name}</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Select day: 
                <Select value={selectedDay.toString()} onValueChange={(v) => setSelectedDay(parseInt(v))}>
                  <SelectTrigger className="w-24 h-7 ml-2 inline-flex">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(maxDays)].map((_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        Day {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </p>
            </div>
          )}
          
          {/* Search Filters */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button onClick={searchExercises} disabled={searchLoading}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <Select value={selectedBodyPart} onValueChange={setSelectedBodyPart}>
                <SelectTrigger>
                  <SelectValue placeholder="All Body Parts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Body Parts</SelectItem>
                  {filters?.bodyParts?.map((part: string) => (
                    <SelectItem key={part} value={part}>
                      {part}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                <SelectTrigger>
                  <SelectValue placeholder="All Equipment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Equipment</SelectItem>
                  {filters?.equipment?.map((equip: string) => (
                    <SelectItem key={equip} value={equip}>
                      {equip}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedTarget} onValueChange={setSelectedTarget}>
                <SelectTrigger>
                  <SelectValue placeholder="All Targets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Targets</SelectItem>
                  {filters?.targets?.map((target: string) => (
                    <SelectItem key={target} value={target}>
                      {target}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Search Results */}
          <ScrollArea className="h-[400px] mt-4">
            {searchLoading ? (
              <div className="text-center py-8">Loading exercises...</div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchResults.map((exercise: any) => (
                  <Card key={exercise.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        {exercise.gifUrl && (
                          <img
                            src={exercise.gifUrl}
                            alt={exercise.name}
                            className="w-20 h-20 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{exercise.name}</h4>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {exercise.bodyPart && (
                              <Badge variant="secondary" className="text-xs">
                                {exercise.bodyPart}
                              </Badge>
                            )}
                            {exercise.target && (
                              <Badge variant="outline" className="text-xs">
                                {exercise.target}
                              </Badge>
                            )}
                          </div>
                          {selectedProgram && (
                            <Button
                              size="sm"
                              className="mt-2"
                              onClick={() => handleAddExercise(exercise)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add to Day {selectedDay}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {hasSyncedExercises ? "No exercises found. Try adjusting your search." : "Click search to load exercises."}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit Exercise Dialog */}
      <Dialog open={!!editingExercise} onOpenChange={() => setEditingExercise(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Exercise Details</DialogTitle>
          </DialogHeader>
          {editingExercise && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-sets">Sets</Label>
                <Input
                  id="edit-sets"
                  type="number"
                  value={editingExercise.sets}
                  onChange={(e) => setEditingExercise({
                    ...editingExercise,
                    sets: parseInt(e.target.value) || 3,
                  })}
                />
              </div>
              <div>
                <Label htmlFor="edit-reps">Reps</Label>
                <Input
                  id="edit-reps"
                  value={editingExercise.reps}
                  onChange={(e) => setEditingExercise({
                    ...editingExercise,
                    reps: e.target.value,
                  })}
                  placeholder="e.g., 10-12, 8, to failure"
                />
              </div>
              <div>
                <Label htmlFor="edit-rest">Rest Time (seconds)</Label>
                <Input
                  id="edit-rest"
                  type="number"
                  value={editingExercise.restTime}
                  onChange={(e) => setEditingExercise({
                    ...editingExercise,
                    restTime: parseInt(e.target.value) || 60,
                  })}
                />
              </div>
              <div>
                <Label htmlFor="edit-day">Day</Label>
                <Select
                  value={editingExercise.day.toString()}
                  onValueChange={(v) => setEditingExercise({
                    ...editingExercise,
                    day: parseInt(v),
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(maxDays)].map((_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        Day {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={editingExercise.notes}
                  onChange={(e) => setEditingExercise({
                    ...editingExercise,
                    notes: e.target.value,
                  })}
                  placeholder="e.g., Focus on slow eccentric, keep core tight"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingExercise(null)}>
                  Cancel
                </Button>
                <Button onClick={saveExerciseEdits}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}