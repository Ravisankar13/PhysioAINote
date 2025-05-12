import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, BookOpen, Info, Award, Calendar, Users } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ResearchArticle {
  id: number;
  title: string;
  authors: string;
  journal: string;
  publicationDate: string;
  doi: string;
  abstract: string;
  url: string;
  bodyPart: string;
  keyFindings: string;
  clinicalRelevance: string;
  createdAt: string;
  updatedAt: string;
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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function ArticleCard({ article }: { article: ResearchArticle }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap gap-2 mb-2">
          <Badge variant="outline" className={bodyPartInfo[article.bodyPart as BodyPartKey]?.color || "bg-gray-100"}>
            {bodyPartInfo[article.bodyPart as BodyPartKey]?.name || article.bodyPart}
          </Badge>
        </div>
        <CardTitle className="text-xl font-serif">{article.title}</CardTitle>
        <CardDescription className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-sm">
          <span className="flex items-center">
            <Users className="h-4 w-4 mr-1" />
            {article.authors}
          </span>
          <span className="flex items-center">
            <BookOpen className="h-4 w-4 mr-1" />
            {article.journal}
          </span>
          <span className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            {formatDate(article.publicationDate)}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-1 flex items-center">
              <Info className="h-4 w-4 mr-1" /> Abstract
            </h4>
            <p className={`text-sm ${!isExpanded && "line-clamp-3"}`}>
              {article.abstract}
            </p>
            {article.abstract.length > 200 && (
              <Button 
                variant="link" 
                className="p-0 h-auto text-sm" 
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? "Show less" : "Show more"}
              </Button>
            )}
          </div>
          
          {article.keyFindings && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1 flex items-center">
                <Award className="h-4 w-4 mr-1" /> Key Findings
              </h4>
              <p className="text-sm">{article.keyFindings}</p>
            </div>
          )}
          
          {article.clinicalRelevance && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Clinical Relevance</h4>
              <p className="text-sm">{article.clinicalRelevance}</p>
            </div>
          )}
          
          <Separator />
          
          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              DOI: {article.doi}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={() => window.open(article.url, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
              View Article
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Research() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<BodyPartKey>("general");
  const [filteredArticles, setFilteredArticles] = useState<ResearchArticle[]>([]);
  
  // Fetch all research articles
  const { data: articles, isLoading, error } = useQuery<ResearchArticle[]>({
    queryKey: ["/api/research"],
  });
  
  // When tab changes or articles load, filter articles for the selected body part
  useEffect(() => {
    if (articles) {
      setFilteredArticles(articles.filter(article => article.bodyPart === selectedTab));
    }
  }, [selectedTab, articles]);
  
  // Handle error in fetching articles
  useEffect(() => {
    if (error) {
      toast({
        title: "Error fetching research articles",
        description: "Could not load the research articles. Please try again later.",
        variant: "destructive",
      });
    }
  }, [error, toast]);
  
  return (
    <div className="container max-w-6xl py-8">
      <Helmet>
        <title>Physiotherapy Research Articles | PhysioAI</title>
        <meta name="description" content="Browse peer-reviewed physiotherapy research articles organized by body part." />
      </Helmet>
      
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Physiotherapy Research</h1>
          <p className="text-muted-foreground mt-1">
            Browse peer-reviewed physiotherapy research articles organized by body part
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Research Articles by Body Part</CardTitle>
            <CardDescription>
              Access the latest peer-reviewed research to inform your clinical practice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="general" value={selectedTab} onValueChange={(value) => setSelectedTab(value as BodyPartKey)}>
              <div className="flex justify-center mb-6 overflow-x-auto">
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
                      {filteredArticles.length > 0 ? (
                        <div className="space-y-4">
                          {filteredArticles.map((article) => (
                            <ArticleCard key={article.id} article={article} />
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                          <p className="text-muted-foreground">No research articles available for this body part.</p>
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