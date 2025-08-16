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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, GripVertical, Edit, Trash2, Copy, Globe, Lock, Users, Dumbbell, Clock, Target, ChevronRight, X } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { ExerciseProgram, ProgramExercise } from "@shared/schema";

interface ExerciseProgramWithExercises extends ExerciseProgram {
  exercises: ProgramExercise[];
}

export default function ExerciseProgramBuilder() {
  const [selectedProgram, setSelectedProgram] = useState<ExerciseProgramWithExercises | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBodyPart, setSelectedBodyPart] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState("");
  const [isExerciseSearchOpen, setIsExerciseSearchOpen] = useState(false);

  // Fetch user's programs
  const { data: programs, isLoading: programsLoading } = useQuery({
    queryKey: ["/api/exercise-programs"],
  });

  // Fetch body parts for filtering
  const { data: bodyParts } = useQuery({
    queryKey: ["/api/external/exercises/bodyparts"],
  });

  // Fetch equipment options
  const { data: equipmentList } = useQuery({
    queryKey: ["/api/external/exercises/equipment"],
  });

  // Search exercises from external API
  const { data: searchResults, isLoading: searchLoading, refetch: searchExercises } = useQuery({
    queryKey: ["/api/external/exercises/search", { 
      bodyPart: selectedBodyPart === "all" ? "" : selectedBodyPart, 
      equipment: selectedEquipment === "all" ? "" : selectedEquipment, 
      name: searchQuery 
    }],
    enabled: false,
  });

  // Auto-search when dialog opens
  useEffect(() => {
    if (isExerciseSearchOpen && !searchResults) {
      searchExercises();
    }
  }, [isExerciseSearchOpen]);

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
    mutationFn: (id: number) => apiRequest(`/api/exercise-programs/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exercise-programs"] });
      setSelectedProgram(null);
      toast({
        title: "Success",
        description: "Program deleted successfully",
      });
    },
  });

  // Add exercise to program mutation
  const addExerciseMutation = useMutation({
    mutationFn: ({ programId, exercise }: { programId: number; exercise: any }) =>
      apiRequest(`/api/exercise-programs/${programId}/exercises`, "POST", exercise),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/exercise-programs/${variables.programId}`] });
      if (selectedProgram) {
        fetchProgramDetails(selectedProgram.id);
      }
      toast({
        title: "Success",
        description: "Exercise added to program",
      });
    },
  });

  // Remove exercise mutation
  const removeExerciseMutation = useMutation({
    mutationFn: (exerciseId: number) => apiRequest(`/api/program-exercises/${exerciseId}`, "DELETE"),
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
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Exercise order updated",
      });
    },
  });

  // Fetch program details with exercises
  const fetchProgramDetails = async (programId: number) => {
    const response = await fetch(`/api/exercise-programs/${programId}`, {
      credentials: "include",
    });
    if (response.ok) {
      const data = await response.json();
      setSelectedProgram(data);
    }
  };

  // Handle drag end for exercise reordering
  const handleDragEnd = (result: any) => {
    if (!result.destination || !selectedProgram) return;

    const items = Array.from(selectedProgram.exercises);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update local state immediately
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
    };

    addExerciseMutation.mutate({
      programId: selectedProgram.id,
      exercise: newExercise,
    });
  };

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
                createProgramMutation.mutate({
                  name: formData.get("name"),
                  description: formData.get("description"),
                  bodyPart: formData.get("bodyPart"),
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
                      <SelectItem value="shoulder">Shoulder</SelectItem>
                      <SelectItem value="neck">Neck</SelectItem>
                      <SelectItem value="back">Back</SelectItem>
                      <SelectItem value="hip">Hip</SelectItem>
                      <SelectItem value="knee">Knee</SelectItem>
                      <SelectItem value="ankle">Ankle</SelectItem>
                      <SelectItem value="general">General</SelectItem>
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
                  <Input id="duration" name="duration" type="number" defaultValue="30" />
                </div>
                <div>
                  <Label htmlFor="frequency">Frequency</Label>
                  <Input id="frequency" name="frequency" placeholder="e.g., 3x per week" />
                </div>
              </div>
              <div>
                <Label htmlFor="visibility">Visibility</Label>
                <Select name="visibility" defaultValue="private">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">
                      <div className="flex items-center">
                        <Lock className="h-4 w-4 mr-2" />
                        Private
                      </div>
                    </SelectItem>
                    <SelectItem value="public">
                      <div className="flex items-center">
                        <Globe className="h-4 w-4 mr-2" />
                        Public
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Create Program</Button>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Programs List */}
        <div className="lg:col-span-1">
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
                <Tabs defaultValue="exercises">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="exercises">Exercises</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    <TabsTrigger value="assign">Assign</TabsTrigger>
                  </TabsList>

                  <TabsContent value="exercises" className="mt-4">
                    {selectedProgram.exercises && selectedProgram.exercises.length > 0 ? (
                      <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="exercises">
                          {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                              {selectedProgram.exercises.map((exercise, index) => (
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
                                              <div>
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
                                              </div>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeExerciseMutation.mutate(exercise.id)}
                                              >
                                                <X className="h-4 w-4" />
                                              </Button>
                                            </div>
                                            <div className="mt-2 text-sm text-muted-foreground">
                                              {exercise.sets && `${exercise.sets} sets`}
                                              {exercise.reps && ` × ${exercise.reps} reps`}
                                              {exercise.duration && ` × ${exercise.duration}`}
                                              {exercise.restTime && ` • ${exercise.restTime}s rest`}
                                            </div>
                                            {exercise.notes && (
                                              <p className="mt-2 text-sm">{exercise.notes}</p>
                                            )}
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
                        <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No exercises added yet</p>
                        <p className="text-sm mt-2">Click "Add Exercise" to build your program</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="preview" className="mt-4">
                    <div className="space-y-4">
                      <Card>
                        <CardContent className="p-6">
                          <h3 className="font-semibold mb-4">Program Overview</h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Total Exercises:</span>
                              <span className="ml-2 font-medium">{selectedProgram.exercises?.length || 0}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Estimated Duration:</span>
                              <span className="ml-2 font-medium">{selectedProgram.duration || 30} minutes</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Difficulty:</span>
                              <span className="ml-2 font-medium">{selectedProgram.difficulty || "Not set"}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Frequency:</span>
                              <span className="ml-2 font-medium">{selectedProgram.frequency || "Not set"}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {selectedProgram.exercises && selectedProgram.exercises.length > 0 && (
                        <Card>
                          <CardContent className="p-6">
                            <h3 className="font-semibold mb-4">Exercise Sequence</h3>
                            <ol className="space-y-3">
                              {selectedProgram.exercises.map((exercise, index) => (
                                <li key={exercise.id} className="flex items-center gap-3">
                                  <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                                    {index + 1}
                                  </span>
                                  <div className="flex-1">
                                    <span className="font-medium">{exercise.name}</span>
                                    <span className="text-sm text-muted-foreground ml-2">
                                      {exercise.sets && `${exercise.sets} sets`}
                                      {exercise.reps && ` × ${exercise.reps} reps`}
                                    </span>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </li>
                              ))}
                            </ol>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="assign" className="mt-4">
                    <Card>
                      <CardContent className="p-6">
                        <div className="text-center py-8">
                          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                          <h3 className="font-semibold text-lg mb-2">Assign to Patients</h3>
                          <p className="text-muted-foreground mb-4">
                            Assign this exercise program to your patients and track their progress
                          </p>
                          <Button disabled>
                            <Users className="h-4 w-4 mr-2" />
                            Coming Soon
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12">
                <div className="text-center">
                  <Dumbbell className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="text-xl font-semibold mb-2">Select or Create a Program</h2>
                  <p className="text-muted-foreground">
                    Choose a program from the list or create a new one to get started
                  </p>
                </div>
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
            <p className="text-sm text-muted-foreground mt-1">
              Search over 1300 exercises with animated demonstrations from ExerciseDB
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Search by exercise name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      searchExercises();
                    }
                  }}
                />
              </div>
              <Select value={selectedBodyPart} onValueChange={(value) => {
                setSelectedBodyPart(value);
                searchExercises();
              }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Body Part" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Body Parts</SelectItem>
                  {bodyParts?.map((part: string) => (
                    <SelectItem key={part} value={part}>
                      {part.charAt(0).toUpperCase() + part.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedEquipment} onValueChange={(value) => {
                setSelectedEquipment(value);
                searchExercises();
              }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Equipment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Equipment</SelectItem>
                  {equipmentList?.map((item: string) => (
                    <SelectItem key={item} value={item}>
                      {item.charAt(0).toUpperCase() + item.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => searchExercises()}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>

            <ScrollArea className="h-[400px]">
              {searchLoading ? (
                <div className="text-center py-8">Searching exercises...</div>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.map((exercise: any) => (
                    <Card key={exercise.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold">{exercise.name}</h4>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {exercise.bodyPart}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {exercise.target}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {exercise.equipment}
                              </Badge>
                            </div>
                            {exercise.instructions && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {exercise.instructions[0]}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              handleAddExercise(exercise);
                              setIsExerciseSearchOpen(false);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-2">Select filters and click search to browse exercises</p>
                  <p className="text-sm">Or type an exercise name to search directly</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}