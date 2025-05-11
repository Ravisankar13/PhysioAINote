import { useState } from "react";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { DeIdentifiedNote } from "@/components/notes/DeIdentifiedNote";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Globe, Search, Filter } from "lucide-react";
import { Loader2 } from "lucide-react";

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

export default function SharedNotes() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [ageFilter, setAgeFilter] = useState("all");
  const [bodyPartFilter, setBodyPartFilter] = useState("all");
  const [visibility, setVisibility] = useState<"all" | "public" | "shared">("all");

  // Fetch notes
  const { data: notes = [], isLoading } = useQuery<SharedNote[]>({
    queryKey: ["/api/notes"],
    queryFn: async () => {
      const res = await fetch("/api/notes");
      if (!res.ok) throw new Error("Failed to fetch shared notes");
      return res.json();
    },
  });

  // Filter notes based on criteria
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
  const ageRanges = ["all", ...new Set(notes.map(note => note.ageRange))];
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
        <meta name="description" content="Browse shared clinical notes from other physiotherapists. Learn from de-identified cases and collaborate with the community." />
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Community Clinical Notes</h1>
            <p className="text-muted-foreground mt-1">
              Browse de-identified clinical notes shared by the physiotherapy community
            </p>
          </div>
        </div>

        {/* Filters and tabs */}
        <div className="flex flex-col space-y-4">
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

        {/* Notes list */}
        {isLoading ? (
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
      </div>
    </div>
  );
}