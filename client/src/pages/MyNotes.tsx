import { useState } from "react";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import GeneratedNote from "@/components/notes/GeneratedNote";
import { ShareNoteDialog } from "@/components/notes/ShareNoteDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  PlusCircle, 
  FilePlus, 
  Shield, 
  Users, 
  Globe,
  Loader2
} from "lucide-react";
import { Link } from "wouter";

interface ClinicalNote {
  id: number;
  patientName: string;
  patientId: string;
  dateOfBirth: string;
  dateOfVisit: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  fullNote: any;
  visibility: string;
  createdAt: string;
  updatedAt: string;
}

export default function MyNotes() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("all");

  // Fetch user's notes
  const {
    data: notes = [],
    isLoading,
    error,
  } = useQuery<ClinicalNote[]>({
    queryKey: ["/api/my-notes"],
    queryFn: async () => {
      const res = await fetch("/api/my-notes");
      if (!res.ok) throw new Error("Failed to fetch your notes");
      return res.json();
    },
  });

  // Filter notes based on search term and visibility
  const filteredNotes = notes.filter((note) => {
    // Filter by visibility if not "all"
    if (visibilityFilter !== "all" && note.visibility !== visibilityFilter) {
      return false;
    }

    // Filter by search term in patient name or ID
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        note.patientName.toLowerCase().includes(searchLower) ||
        note.patientId.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  // Get note sharing status icon
  const getNoteStatusIcon = (visibility: string) => {
    switch (visibility) {
      case "private":
        return <Shield className="h-4 w-4 text-gray-500" />;
      case "shared":
        return <Users className="h-4 w-4 text-blue-500" />;
      case "public":
        return <Globe className="h-4 w-4 text-green-500" />;
      default:
        return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get note status label
  const getNoteStatusLabel = (visibility: string) => {
    switch (visibility) {
      case "private":
        return "Private";
      case "shared":
        return "Shared with Colleagues";
      case "public":
        return "Public";
      default:
        return "Private";
    }
  };

  return (
    <div className="container max-w-6xl py-8">
      <Helmet>
        <title>My Clinical Notes | PhysioAI Conversation</title>
        <meta name="description" content="Manage your clinical notes, edit details, and choose sharing options." />
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Clinical Notes</h1>
            <p className="text-muted-foreground mt-1">
              Manage your clinical notes and control sharing settings
            </p>
          </div>
          <Link href="/clinical-notes">
            <Button className="flex items-center gap-2">
              <FilePlus className="h-4 w-4" />
              <span>Create New Note</span>
            </Button>
          </Link>
        </div>

        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Tabs value={visibilityFilter} onValueChange={setVisibilityFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="private" className="flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Private</span>
                </TabsTrigger>
                <TabsTrigger value="shared" className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  <span>Shared</span>
                </TabsTrigger>
                <TabsTrigger value="public" className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" />
                  <span>Public</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center p-12 border rounded-lg bg-red-50 dark:bg-red-900/20">
            <h3 className="text-lg font-medium text-red-700 dark:text-red-300">Error loading notes</h3>
            <p className="text-red-600 dark:text-red-400 mt-1">
              There was a problem fetching your clinical notes.
            </p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center p-12 border rounded-lg bg-gray-50 dark:bg-gray-900">
            <h3 className="text-lg font-medium">No notes found</h3>
            <p className="text-muted-foreground mt-1">
              {searchTerm || visibilityFilter !== "all"
                ? "Try adjusting your search or filters"
                : "You haven't created any clinical notes yet"}
            </p>
            {!searchTerm && visibilityFilter === "all" && (
              <Link href="/clinical-notes">
                <Button variant="outline" className="mt-4 flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  <span>Create Your First Note</span>
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredNotes.map((note) => (
              <div key={note.id} className="border rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-medium text-lg">{note.patientName}</h3>
                    <div className="flex gap-x-2 text-sm text-muted-foreground">
                      <span>ID: {note.patientId}</span>
                      <span>•</span>
                      <span>DOB: {note.dateOfBirth}</span>
                      <span>•</span>
                      <span>Visit: {note.dateOfVisit}</span>
                    </div>
                    <div className="flex items-center mt-2">
                      <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1 text-xs">
                        {getNoteStatusIcon(note.visibility)}
                        <span className="ml-1">{getNoteStatusLabel(note.visibility)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <ShareNoteDialog noteId={note.id} currentVisibility={note.visibility} />
                    <Link href={`/clinical-notes/${note.id}`}>
                      <Button variant="default" size="sm">View Note</Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}