import { Helmet } from "react-helmet";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeIdentifiedNote } from "@/components/notes/DeIdentifiedNote";
import { useToast } from "@/hooks/use-toast";

// Interface for the sample note data
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

export default function SampleNotes() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<BodyPartKey>("shoulder");
  const [filteredNotes, setFilteredNotes] = useState<SampleNote[]>([]);
  
  // Fetch all sample notes
  const { data: notes, isLoading, error } = useQuery<SampleNote[]>({
    queryKey: ["/api/sample-notes"],
  });
  
  // When tab changes or notes load, filter notes for the selected body part
  useEffect(() => {
    if (notes) {
      setFilteredNotes(notes.filter(note => note.bodyPart === selectedTab));
    }
  }, [selectedTab, notes]);
  
  // Handle error in fetching notes
  useEffect(() => {
    if (error) {
      toast({
        title: "Error fetching sample notes",
        description: "Could not load the sample clinical notes. Please try again later.",
        variant: "destructive",
      });
    }
  }, [error, toast]);
  
  return (
    <div className="container max-w-6xl py-8">
      <Helmet>
        <title>Sample Clinical Notes | PhysioAI</title>
        <meta name="description" content="Browse sample clinical notes for various physiotherapy conditions organized by body parts." />
      </Helmet>
      
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sample Clinical Notes</h1>
          <p className="text-muted-foreground mt-1">
            Browse example physiotherapy notes for different body parts and conditions
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Sample SOAP Notes by Body Part</CardTitle>
            <CardDescription>
              These are de-identified examples of clinical documentation for common physiotherapy conditions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="shoulder" value={selectedTab} onValueChange={(value) => setSelectedTab(value as BodyPartKey)}>
              <div className="flex justify-center mb-6">
                <TabsList className="grid grid-cols-4 md:grid-cols-6 gap-1">
                  {Object.entries(bodyPartInfo).map(([key, info]) => (
                    <TabsTrigger 
                      key={key} 
                      value={key}
                      className="text-xs sm:text-sm"
                    >
                      {info.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div>
                  {Object.keys(bodyPartInfo).map((key) => (
                    <TabsContent key={key} value={key} className="mt-0">
                      {filteredNotes.length > 0 ? (
                        <div className="space-y-8">
                          {filteredNotes.map((note, index) => (
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
                                  deIdentifiedNote: note.deIdentifiedNote,
                                  visibility: "public",
                                  createdAt: new Date().toISOString(),
                                  updatedAt: new Date().toISOString(),
                                }}
                                authorName="Sample Provider, PT"
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
      </div>
    </div>
  );
}