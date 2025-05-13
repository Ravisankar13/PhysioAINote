import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { RelatedResearch } from "./RelatedResearch";
import { useAuth } from "@/hooks/use-auth";

interface DeIdentifiedNoteProps {
  note: {
    id: number;
    userId: number;
    condition: string;
    ageRange: string;
    bodyPart?: string;
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
  };
  authorName: string;
}

export function DeIdentifiedNote({ note, authorName }: DeIdentifiedNoteProps) {
  const [showResearch, setShowResearch] = useState(false);
  const { user } = useAuth();
  
  // Determine if we should show research articles based on visibility and authentication
  const canShowResearch = note.visibility !== "private" || (user && note.userId === user.id);
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex flex-wrap gap-2 items-center">
          <span>De-identified Clinical Note</span>
          <Badge variant="outline" className="ml-2">{note.ageRange}</Badge>
          {note.bodyPart && (
            <Badge variant="outline" className="ml-1">{note.bodyPart}</Badge>
          )}
        </CardTitle>
        <CardDescription className="flex flex-col sm:flex-row justify-between">
          <span>Documented by {authorName}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="subjective" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="subjective">Subjective</TabsTrigger>
            <TabsTrigger value="objective">Objective</TabsTrigger>
            <TabsTrigger value="assessment">Assessment</TabsTrigger>
            <TabsTrigger value="plan">Plan</TabsTrigger>
          </TabsList>
          <TabsContent value="subjective" className="mt-4">
            <div className="p-4 border rounded-md bg-gray-50 whitespace-pre-wrap">
              {note.deIdentifiedNote?.subjective || "No subjective information available."}
            </div>
          </TabsContent>
          <TabsContent value="objective" className="mt-4">
            <div className="p-4 border rounded-md bg-gray-50 whitespace-pre-wrap">
              {note.deIdentifiedNote?.objective || "No objective information available."}
            </div>
          </TabsContent>
          <TabsContent value="assessment" className="mt-4">
            <div className="p-4 border rounded-md bg-gray-50 whitespace-pre-wrap">
              {note.deIdentifiedNote?.assessment || "No assessment information available."}
            </div>
          </TabsContent>
          <TabsContent value="plan" className="mt-4">
            <div className="p-4 border rounded-md bg-gray-50 whitespace-pre-wrap">
              {note.deIdentifiedNote?.plan || "No plan information available."}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {canShowResearch && (
        <CardFooter className="flex flex-col items-stretch border-t pt-4">
          <Button 
            variant="ghost" 
            className="flex justify-between items-center"
            onClick={() => setShowResearch(!showResearch)}
          >
            <div className="flex items-center">
              <BookOpen className="h-4 w-4 mr-2" />
              <span>Related Research Articles</span>
            </div>
            {showResearch ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          
          {showResearch && (
            <div className="mt-4">
              <RelatedResearch noteId={note.id} />
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}