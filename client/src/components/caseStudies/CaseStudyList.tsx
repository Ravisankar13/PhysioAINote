import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, Plus, Search, BookOpen, Activity } from "lucide-react";
import { bodyPartEnum } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface CaseStudyListProps {
  onSelectCase: (caseId: number) => void;
  onCreateCase: () => void;
}

const bodyPartOptions = [
  { value: "all", label: "All Body Parts" },
  { value: "shoulder", label: "Shoulder" },
  { value: "neck", label: "Neck" },
  { value: "back", label: "Back" },
  { value: "elbow", label: "Elbow" },
  { value: "wrist", label: "Wrist" },
  { value: "hand", label: "Hand" },
  { value: "hip", label: "Hip" },
  { value: "knee", label: "Knee" },
  { value: "ankle", label: "Ankle" },
  { value: "foot", label: "Foot" },
  { value: "general", label: "General" },
  { value: "other", label: "Other" },
];

const complexityOptions = [
  { value: "all", label: "All Levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export default function CaseStudyList({ onSelectCase, onCreateCase }: CaseStudyListProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [bodyPart, setBodyPart] = useState<string>("");
  const [complexity, setComplexity] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Fetch case studies with filtering and pagination
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/case-studies', bodyPart, complexity, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (bodyPart && bodyPart !== 'all') params.append('bodyPart', bodyPart);
      if (complexity && complexity !== 'all') params.append('complexity', complexity);
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      
      const response = await fetch(`/api/case-studies?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch case studies');
      }
      return response.json();
    }
  });

  // Filter cases by search term if provided
  const filteredCases = searchTerm && data?.caseStudies
    ? data.caseStudies.filter((c: any) => 
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.patientDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.correctDiagnosis.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : data?.caseStudies || [];

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center p-6">
            <p className="text-red-500 mb-4">Error loading case studies</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl">AI-Generated Case Studies</CardTitle>
          <Button onClick={onCreateCase}>
            <Plus className="h-4 w-4 mr-2" />
            New Case Study
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-4">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search case studies..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={bodyPart} onValueChange={setBodyPart}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by body part" />
            </SelectTrigger>
            <SelectContent>
              {bodyPartOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={complexity} onValueChange={setComplexity}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by complexity" />
            </SelectTrigger>
            <SelectContent>
              {complexityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="text-center p-8 border rounded-lg bg-muted/50">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No case studies found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm || bodyPart || complexity ? 
                "Try adjusting your filters or search term" : 
                "Create your first case study to get started"}
            </p>
            <Button onClick={onCreateCase}>
              <Plus className="h-4 w-4 mr-2" />
              Create Case Study
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {filteredCases.map((caseStudy: any) => (
                <div 
                  key={caseStudy.id} 
                  className="border rounded-lg p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => onSelectCase(caseStudy.id)}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-medium">{caseStudy.title}</h3>
                    <div className="flex space-x-2">
                      <Badge variant="outline" className="capitalize">
                        {caseStudy.bodyPart}
                      </Badge>
                      <Badge className="capitalize">
                        {caseStudy.complexity}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="mt-2 text-sm line-clamp-2 text-muted-foreground">
                    {caseStudy.patientDescription}
                  </p>
                  
                  <div className="flex items-center mt-3 text-sm text-muted-foreground">
                    <Brain className="h-4 w-4 mr-1" />
                    <span className="mr-4">Diagnosis: {caseStudy.correctDiagnosis}</span>
                    <Activity className="h-4 w-4 mr-1" />
                    <span>Created: {new Date(caseStudy.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center px-4">
                    Page {page} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}