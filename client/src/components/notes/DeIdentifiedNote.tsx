import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex flex-wrap gap-2 items-center">
          <span>De-identified Clinical Note</span>
          <Badge variant="outline" className="ml-2">{note.ageRange}</Badge>
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
    </Card>
  );
}