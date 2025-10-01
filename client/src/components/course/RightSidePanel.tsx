import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  FileText, 
  MessageSquare, 
  CreditCard, 
  ExternalLink,
  Clock,
  Users,
  ThumbsUp 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface RightSidePanelProps {
  courseId: number;
  moduleId: number;
  sectionIndex: number | null;
  bodyPart: string;
  sectionTitle?: string;
}

interface ResearchArticle {
  id: number;
  title: string;
  author: string;
  year: number;
  journal: string;
  doi: string;
  studyType: string;
  bodyPart: string;
  focusArea: string[];
  keyFindings: string[];
  clinicalApplication: string;
  biasAssessment: string;
  relevanceScore: number;
  createdAt: string;
}

export function RightSidePanel({ 
  courseId, 
  moduleId, 
  sectionIndex,
  bodyPart,
  sectionTitle 
}: RightSidePanelProps) {
  const [activeTab, setActiveTab] = useState("research");

  // Fetch relevant research articles
  const { data: researchArticles = [], isLoading: researchLoading } = useQuery<ResearchArticle[]>({
    queryKey: ["/api/research", { bodyPart, limit: 10 }],
    enabled: activeTab === "research"
  });

  // Fetch section notes
  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: sectionIndex !== null 
      ? ["/api/education/notes", courseId, moduleId, sectionIndex]
      : [],
    enabled: activeTab === "notes" && sectionIndex !== null
  });

  // Fetch section discussions
  const { data: discussions = [], isLoading: discussionsLoading } = useQuery({
    queryKey: sectionIndex !== null
      ? ["/api/education/discussions", courseId, moduleId, sectionIndex]
      : [],
    enabled: activeTab === "discussions" && sectionIndex !== null
  });

  // Fetch flashcards
  const { data: flashcards = [], isLoading: flashcardsLoading } = useQuery({
    queryKey: ["/api/education/flashcards", courseId],
    enabled: activeTab === "flashcards"
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Learning Tools</CardTitle>
        <CardDescription className="text-xs">
          {sectionTitle || "Select a section to view tools"}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mx-4 mt-2">
            <TabsTrigger value="research" className="text-xs" data-testid="tab-research">
              <BookOpen className="h-3 w-3 mr-1" />
              Research
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-xs" data-testid="tab-notes">
              <FileText className="h-3 w-3 mr-1" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="discussions" className="text-xs" data-testid="tab-discussions">
              <MessageSquare className="h-3 w-3 mr-1" />
              Discuss
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="text-xs" data-testid="tab-flashcards">
              <CreditCard className="h-3 w-3 mr-1" />
              Cards
            </TabsTrigger>
          </TabsList>

          {/* Research Tab */}
          <TabsContent value="research" className="flex-1 m-0 p-4">
            <ScrollArea className="h-full">
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground mb-3">
                  Relevant research for {bodyPart} physiotherapy
                </div>
                
                {researchLoading ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Loading research articles...
                  </div>
                ) : researchArticles.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    No research articles available for this topic yet.
                  </div>
                ) : (
                  researchArticles.map((article) => (
                    <Card key={article.id} className="p-3 hover:bg-muted/50 transition-colors">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium line-clamp-2">{article.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{article.author}</span>
                          <span>•</span>
                          <span>{article.year}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {article.studyType}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Relevance: {article.relevanceScore}/10
                          </Badge>
                        </div>
                        {article.keyFindings.length > 0 && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {article.keyFindings[0]}
                          </p>
                        )}
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          asChild
                        >
                          <a
                            href={`https://doi.org/${article.doi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`link-article-${article.id}`}
                          >
                            View Article
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="flex-1 m-0 p-4">
            <ScrollArea className="h-full">
              {sectionIndex === null ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Select a section to view or create notes
                </div>
              ) : notesLoading ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Loading notes...
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground mb-3">
                    Notes for this section
                  </div>
                  {/* Notes implementation placeholder */}
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Notes feature coming soon
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Discussions Tab */}
          <TabsContent value="discussions" className="flex-1 m-0 p-4">
            <ScrollArea className="h-full">
              {sectionIndex === null ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Select a section to view or start discussions
                </div>
              ) : discussionsLoading ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Loading discussions...
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground mb-3">
                    Discussions for this section
                  </div>
                  {/* Discussions implementation placeholder */}
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Discussions feature coming soon
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Flashcards Tab */}
          <TabsContent value="flashcards" className="flex-1 m-0 p-4">
            <ScrollArea className="h-full">
              {flashcardsLoading ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Loading flashcards...
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground mb-3">
                    Your flashcards for this course
                  </div>
                  {/* Flashcards implementation placeholder */}
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Flashcards feature coming soon
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
