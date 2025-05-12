import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { DeIdentifiedNote } from "@/components/notes/DeIdentifiedNote";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, Globe, Search, Filter, BookOpen, Bookmark } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Interface for de-identified notes
interface SharedNote {
  id: number;
  userId: number;
  condition: string;
  ageRange: string;
  bodyPart: string;
  deIdentifiedNote: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  visibility: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    username: string;
  };
}

// Interface for sample notes
interface SampleNote {
  bodyPart: string;
  condition: string;
  ageRange: string;
  deIdentifiedNote: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
}

// Map of body part categories to display names and colors
const bodyPartInfo = {
  shoulder: { name: "Shoulder", color: "bg-blue-100 text-blue-800 hover:bg-blue-200" },
  neck: { name: "Neck", color: "bg-indigo-100 text-indigo-800 hover:bg-indigo-200" },
  back: { name: "Back", color: "bg-purple-100 text-purple-800 hover:bg-purple-200" },
  elbow: { name: "Elbow", color: "bg-green-100 text-green-800 hover:bg-green-200" },
  wrist: { name: "Wrist", color: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" },
  hand: { name: "Hand", color: "bg-teal-100 text-teal-800 hover:bg-teal-200" },
  hip: { name: "Hip", color: "bg-cyan-100 text-cyan-800 hover:bg-cyan-200" },
  knee: { name: "Knee", color: "bg-sky-100 text-sky-800 hover:bg-sky-200" },
  ankle: { name: "Ankle", color: "bg-amber-100 text-amber-800 hover:bg-amber-200" },
  foot: { name: "Foot", color: "bg-orange-100 text-orange-800 hover:bg-orange-200" },
  general: { name: "General", color: "bg-gray-100 text-gray-800 hover:bg-gray-200" },
  other: { name: "Other", color: "bg-slate-100 text-slate-800 hover:bg-slate-200" },
};

type BodyPartKey = keyof typeof bodyPartInfo;

export default function SharedNotes() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"community" | "sample">("community");
  const [searchTerm, setSearchTerm] = useState("");
  const [ageFilter, setAgeFilter] = useState("all");
  const [bodyPartFilter, setBodyPartFilter] = useState("all");
  const [visibility, setVisibility] = useState<"all" | "public" | "shared">("all");
  const [selectedSampleBodyPart, setSelectedSampleBodyPart] = useState<BodyPartKey>("shoulder");
  const [filteredSampleNotes, setFilteredSampleNotes] = useState<SampleNote[]>([]);

  // Fetch community shared notes
  const { data: notes = [], isLoading: isLoadingNotes } = useQuery<SharedNote[]>({
    queryKey: ["/api/notes"],
    queryFn: async () => {
      const res = await fetch("/api/notes");
      if (!res.ok) throw new Error("Failed to fetch shared notes");
      return res.json();
    },
  });

  // Fetch sample notes
  const { 
    data: sampleNotes = [], 
    isLoading: isLoadingSampleNotes, 
    error: sampleError 
  } = useQuery<SampleNote[]>({
    queryKey: ["/api/sample-notes"],
  });

  // Handle error in fetching sample notes
  useEffect(() => {
    if (sampleError) {
      toast({
        title: "Error fetching sample notes",
        description: "Could not load the sample clinical notes. Please try again later.",
        variant: "destructive",
      });
    }
  }, [sampleError, toast]);

  // When tab changes or sample notes load, filter sample notes for the selected body part
  useEffect(() => {
    if (sampleNotes.length > 0) {
      setFilteredSampleNotes(sampleNotes.filter(note => note.bodyPart === selectedSampleBodyPart));
    }
  }, [selectedSampleBodyPart, sampleNotes]);

  // Filter community notes based on criteria
  const filteredNotes = notes.filter((note) => {
    // Filter by visibility
    if (visibility !== "all" && note.visibility !== visibility) {
      return false;
    }
    
    // Filter by search term (if any)
    if (searchTerm && !note.condition.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filter by age range (if selected)
    if (ageFilter !== "all" && ageFilter !== note.ageRange) {
      return false;
    }
    
    // Filter by body part (if selected)
    if (bodyPartFilter !== "all" && bodyPartFilter !== note.bodyPart) {
      return false;
    }
    
    return true;
  });

  // Extract unique age ranges and body parts for the filter dropdowns
  const ageRanges = ["all", ...Array.from(new Set(notes.map(note => note.ageRange)))];
  const bodyParts = ["all", "shoulder", "neck", "back", "elbow", "wrist", "hand", "hip", "knee", "ankle", "foot", "general", "other"];
  
  // Group notes by body part for categorized display
  const notesByBodyPart: Record<string, SharedNote[]> = {};
  if (bodyPartFilter === "all") {
    // When no body part filter is applied, group notes by body part
    bodyParts.forEach(part => {
      if (part !== "all") {
        const notesForPart = filteredNotes.filter(note => note.bodyPart === part);
        if (notesForPart.length > 0) {
          notesByBodyPart[part] = notesForPart;
        }
      }
    });
  }

  return (
    <div className="container max-w-6xl py-8">
      <Helmet>
        <title>Shared Clinical Notes | PhysioAI Conversation</title>
        <meta name="description" content="Browse shared clinical notes from other physiotherapists and example notes from administration. Learn from de-identified cases and collaborate with the community." />
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shared Clinical Notes</h1>
            <p className="text-muted-foreground mt-1">
              Browse de-identified clinical notes from the community and example notes from administration
            </p>
          </div>
        </div>

        {/* View Selector: Community or Sample Notes */}
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "community" | "sample")} className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-6">
            <TabsTrigger value="community" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Community Notes</span>
            </TabsTrigger>
            <TabsTrigger value="sample" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>Example Notes (Admin)</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Community Notes Content */}
          <TabsContent value="community" className="mt-0">
            {/* Filters for community notes */}
            <div className="flex flex-col space-y-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-grow">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by condition..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {/* Age Range Filter */}
                  <div className="w-36">
                    <Select value={ageFilter} onValueChange={setAgeFilter}>
                      <SelectTrigger className="w-full">
                        <div className="flex items-center">
                          <Filter className="mr-2 h-4 w-4" />
                          <span>Age Range</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Ages</SelectItem>
                        {ageRanges
                          .filter(range => range !== "all")
                          .map(range => (
                            <SelectItem key={range} value={range}>
                              {range}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Body Part Filter */}
                  <div className="w-36">
                    <Select value={bodyPartFilter} onValueChange={setBodyPartFilter}>
                      <SelectTrigger className="w-full">
                        <div className="flex items-center">
                          <Filter className="mr-2 h-4 w-4" />
                          <span>Body Part</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Body Parts</SelectItem>
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
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Visibility Filter */}
                  <Tabs value={visibility} onValueChange={(value) => setVisibility(value as any)}>
                    <TabsList>
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="public" className="flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5" />
                        <span>Public</span>
                      </TabsTrigger>
                      <TabsTrigger value="shared" className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        <span>Shared</span>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            </div>

            {/* Community Notes list */}
            {isLoadingNotes ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="text-center p-12 border rounded-lg bg-gray-50 dark:bg-gray-900">
                <h3 className="text-lg font-medium">No notes found</h3>
                <p className="text-muted-foreground mt-1">
                  {searchTerm || ageFilter !== "all" || bodyPartFilter !== "all" || visibility !== "all"
                    ? "Try adjusting your filters to see more notes"
                    : "There are no shared clinical notes available at the moment"}
                </p>
              </div>
            ) : bodyPartFilter !== "all" ? (
              // When a specific body part is selected, show all matching notes
              <div className="grid gap-6">
                {filteredNotes.map((note) => (
                  <DeIdentifiedNote 
                    key={note.id} 
                    note={note} 
                    authorName={note.user?.username || "Unknown User"} 
                  />
                ))}
              </div>
            ) : (
              // When viewing all body parts, organize by category
              <div className="space-y-10">
                {Object.keys(notesByBodyPart).length > 0 ? (
                  Object.entries(notesByBodyPart).map(([bodyPart, notes]) => (
                    <div key={bodyPart} className="space-y-4">
                      <div className="border-b pb-2">
                        <h2 className="text-2xl font-bold capitalize">{bodyPart}</h2>
                        <p className="text-muted-foreground text-sm">
                          {notes.length} {notes.length === 1 ? 'note' : 'notes'} in this category
                        </p>
                      </div>
                      
                      <div className="grid gap-6">
                        {notes.map((note) => (
                          <DeIdentifiedNote 
                            key={note.id} 
                            note={note} 
                            authorName={note.user?.username || "Unknown User"} 
                          />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  // Fallback if no categorization is possible
                  <div className="grid gap-6">
                    {filteredNotes.map((note) => (
                      <DeIdentifiedNote 
                        key={note.id} 
                        note={note} 
                        authorName={note.user?.username || "Unknown User"} 
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          {/* Sample Notes Content */}
          <TabsContent value="sample" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Sample SOAP Notes by Body Part</CardTitle>
                <CardDescription>
                  Expert-created example notes for common physiotherapy conditions provided by administration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs 
                  defaultValue="shoulder" 
                  value={selectedSampleBodyPart} 
                  onValueChange={(value) => setSelectedSampleBodyPart(value as BodyPartKey)}
                >
                  <div className="flex mb-6 overflow-x-auto">
                    <TabsList className="flex flex-nowrap min-w-full">
                      {Object.entries(bodyPartInfo).map(([key, info]) => (
                        <TabsTrigger 
                          key={key} 
                          value={key}
                          className="text-xs sm:text-sm whitespace-nowrap"
                        >
                          {info.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                  
                  {isLoadingSampleNotes ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <div>
                      {Object.keys(bodyPartInfo).map((key) => (
                        <TabsContent key={key} value={key} className="mt-0">
                          {filteredSampleNotes.length > 0 ? (
                            <div className="space-y-8">
                              {filteredSampleNotes.map((note, index) => (
                                <div key={index} className="space-y-4">
                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                    <div>
                                      <h2 className="text-xl font-semibold">
                                        {note.condition}
                                      </h2>
                                      <div className="flex flex-wrap gap-2 mt-1">
                                        <Badge variant="outline" className={bodyPartInfo[note.bodyPart as BodyPartKey].color}>
                                          {bodyPartInfo[note.bodyPart as BodyPartKey].name}
                                        </Badge>
                                        <Badge variant="outline">Age: {note.ageRange}</Badge>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <DeIdentifiedNote 
                                    note={{
                                      id: index,
                                      userId: 0,
                                      condition: note.condition,
                                      ageRange: note.ageRange,
                                      bodyPart: note.bodyPart,
                                      deIdentifiedNote: note.deIdentifiedNote,
                                      visibility: "public",
                                      createdAt: new Date().toISOString(),
                                      updatedAt: new Date().toISOString(),
                                      user: { username: "Admin" }
                                    }}
                                    authorName="Admin (Sample)"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                              <p className="text-muted-foreground">No sample notes available for this body part.</p>
                            </div>
                          )}
                        </TabsContent>
                      ))}
                    </div>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}