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
  const [filter, setFilter] = useState("all");
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
    if (filter !== "all" && filter !== note.ageRange) {
      return false;
    }
    
    return true;
  });

  // Extract unique age ranges for the filter dropdown
  const ageRanges = ["all", ...new Set(notes.map(note => note.ageRange))];

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
            
            <div className="flex gap-2">
              <div className="w-40">
                <Select value={filter} onValueChange={setFilter}>
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
              {searchTerm || filter !== "all" || visibility !== "all"
                ? "Try adjusting your filters to see more notes"
                : "There are no shared clinical notes available at the moment"}
            </p>
          </div>
        ) : (
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
    </div>
  );
}