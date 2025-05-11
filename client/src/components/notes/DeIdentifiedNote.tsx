import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Shield, Info, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CommentSection } from "./CommentSection";

interface DeIdentifiedNoteProps {
  note: {
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
  };
  authorName: string;
}

export function DeIdentifiedNote({ note, authorName }: DeIdentifiedNoteProps) {
  const [activeTab, setActiveTab] = useState("subjective");
  const [showComments, setShowComments] = useState(false);

  // Format date for display
  const formattedDate = formatDistanceToNow(new Date(note.createdAt), { addSuffix: true });

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl font-bold">
              {note.condition}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="ml-2" variant={note.visibility === "public" ? "secondary" : "outline"}>
                      <Shield className="h-3 w-3 mr-1" />
                      {note.visibility === "public" ? "Public" : "Shared"}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {note.visibility === "public" 
                        ? "This note is publicly viewable with personal information removed"
                        : "This note is shared with authenticated users only"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription className="mt-1 text-sm text-muted-foreground">
              <div className="flex gap-x-1 flex-wrap">
                <span className="inline-flex items-center">
                  <span className="font-medium">Patient Age Range:</span> {note.ageRange}
                </span>
                <span className="mx-2">•</span>
                <span>Shared by {authorName}</span>
                <span className="mx-2">•</span>
                <span>Updated {formattedDate}</span>
              </div>
            </CardDescription>
          </div>

          <div>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => setShowComments(!showComments)}
            >
              <MessageSquare className="h-4 w-4" />
              <span>{showComments ? "Hide Comments" : "Show Comments"}</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center mt-2 p-2 rounded-md bg-blue-50 dark:bg-blue-950">
          <Info className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
          <p className="text-xs text-blue-800 dark:text-blue-300">
            This is a de-identified clinical note. All personal information has been removed to protect patient privacy
            while allowing physiotherapists to learn from this case.
          </p>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="subjective" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="subjective">Subjective</TabsTrigger>
            <TabsTrigger value="objective">Objective</TabsTrigger>
            <TabsTrigger value="assessment">Assessment</TabsTrigger>
            <TabsTrigger value="plan">Plan</TabsTrigger>
          </TabsList>
          
          <TabsContent value="subjective" className="space-y-4">
            <div className="whitespace-pre-wrap p-4 bg-gray-50 dark:bg-gray-900 rounded-md min-h-[200px]">
              {note.deIdentifiedNote.subjective || "No subjective information provided."}
            </div>
          </TabsContent>
          
          <TabsContent value="objective" className="space-y-4">
            <div className="whitespace-pre-wrap p-4 bg-gray-50 dark:bg-gray-900 rounded-md min-h-[200px]">
              {note.deIdentifiedNote.objective || "No objective information provided."}
            </div>
          </TabsContent>
          
          <TabsContent value="assessment" className="space-y-4">
            <div className="whitespace-pre-wrap p-4 bg-gray-50 dark:bg-gray-900 rounded-md min-h-[200px]">
              {note.deIdentifiedNote.assessment || "No assessment information provided."}
            </div>
          </TabsContent>
          
          <TabsContent value="plan" className="space-y-4">
            <div className="whitespace-pre-wrap p-4 bg-gray-50 dark:bg-gray-900 rounded-md min-h-[200px]">
              {note.deIdentifiedNote.plan || "No plan information provided."}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {showComments && (
        <CardFooter className="flex-col items-start border-t pt-6">
          <h3 className="text-sm font-medium mb-4">Discussion</h3>
          <CommentSection noteId={note.id} />
        </CardFooter>
      )}
    </Card>
  );
}