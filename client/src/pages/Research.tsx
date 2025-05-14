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
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis 
} from "@/components/ui/pagination";
import MembershipRequired from "@/components/MembershipRequired";

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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<ResearchArticle[]>([]);
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10; // Number of articles per page
  
  // Fetch paginated research articles
  const { data: articlesResponse, isLoading, error } = useQuery<{
    data: ResearchArticle[],
    pagination: {
      page: number,
      pageSize: number,
      totalItems: number,
      totalPages: number
    }
  }>({
    queryKey: ["/api/research", selectedTab, currentPage, pageSize],
    queryFn: async () => {
      const response = await fetch(`/api/research?bodyPart=${selectedTab}&page=${currentPage}&pageSize=${pageSize}`);
      if (!response.ok) {
        throw new Error('Failed to fetch research articles');
      }
      return response.json();
    }
  });
  
  // Reset to first page when changing tabs
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTab]);

  // When tab changes, articles load, or pagination changes
  useEffect(() => {
    if (articlesResponse) {
      // Get articles for the current page
      setFilteredArticles(articlesResponse.data);
      
      // If there's a search query, search across ALL articles
      // Note: We may need to adjust this to search server-side for better performance with large datasets
      if (searchQuery.trim()) {
        const searchTermLower = searchQuery.toLowerCase();
        const allMatchingArticles = articlesResponse.data.filter(article => 
          article.title.toLowerCase().includes(searchTermLower) ||
          article.abstract.toLowerCase().includes(searchTermLower) ||
          article.authors.toLowerCase().includes(searchTermLower) ||
          article.journal.toLowerCase().includes(searchTermLower) ||
          article.keyFindings?.toLowerCase().includes(searchTermLower) ||
          article.clinicalRelevance?.toLowerCase().includes(searchTermLower)
        );
        
        setSearchResults(allMatchingArticles);
      } else {
        setSearchResults([]);
      }
    }
  }, [selectedTab, articlesResponse, searchQuery]);
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
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
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  return (
    <div className="container max-w-6xl py-8 mx-auto">
      <Helmet>
        <title>Physiotherapy Research Articles | PhysioAI</title>
        <meta name="description" content="Browse peer-reviewed physiotherapy research articles organized by body part." />
      </Helmet>
      
      <MembershipRequired feature="research">
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Physiotherapy Research</h1>
            <p className="text-muted-foreground mt-1">
              Browse peer-reviewed physiotherapy research articles organized by body part
            </p>
          </div>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Research Articles by Body Part</CardTitle>
            <CardDescription>
              Access the latest peer-reviewed research to inform your clinical practice
            </CardDescription>
            
            {/* Search bar */}
            <div className="mt-4 relative">
              <input
                type="text"
                placeholder="Search articles by title, author, content..."
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                value={searchQuery}
                onChange={handleSearchChange}
              />
              {searchQuery && (
                <button 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setSearchQuery("")}
                >
                  ✕
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="general" value={selectedTab} onValueChange={(value) => setSelectedTab(value as BodyPartKey)}>
              <div className="mb-6 overflow-x-auto">
                <TabsList className="flex flex-nowrap min-w-full">
                  {Object.entries(bodyPartInfo).map(([key, info]) => (
                    <TabsTrigger 
                      key={key} 
                      value={key}
                      className="text-xs sm:text-sm whitespace-nowrap"
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
                  {searchQuery && (
                    <div className="mb-4 text-sm text-muted-foreground">
                      {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found for "{searchQuery}" across all body parts
                    </div>
                  )}
                  
                  {/* When searching, show all results in a single view */}
                  {searchQuery ? (
                    <div className="mt-0">
                      {searchResults.length > 0 ? (
                        <div className="space-y-6">
                          {searchResults.map((article) => (
                            <div key={article.id} className="space-y-1">
                              <Badge 
                                className={`mb-2 ${bodyPartInfo[article.bodyPart as BodyPartKey]?.color || "bg-gray-100 text-gray-800"}`}
                              >
                                {bodyPartInfo[article.bodyPart as BodyPartKey]?.name || article.bodyPart}
                              </Badge>
                              <ArticleCard article={article} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                          <p className="text-muted-foreground">
                            No articles found matching "{searchQuery}" in any category.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    // When not searching, show normal tabs view with pagination
                    Object.keys(bodyPartInfo).map((key) => (
                      <TabsContent key={key} value={key} className="mt-0">
                        {filteredArticles.length > 0 ? (
                          <div className="space-y-6">
                            <div className="space-y-4">
                              {filteredArticles.map((article) => (
                                <ArticleCard key={article.id} article={article} />
                              ))}
                            </div>
                            
                            {/* Pagination component */}
                            {articlesResponse && articlesResponse.pagination.totalPages > 1 && (
                              <Pagination className="mt-8">
                                <PaginationContent>
                                  {currentPage > 1 && (
                                    <PaginationItem>
                                      <PaginationPrevious onClick={() => handlePageChange(currentPage - 1)} />
                                    </PaginationItem>
                                  )}
                                  
                                  {/* First page */}
                                  {currentPage > 2 && (
                                    <PaginationItem>
                                      <PaginationLink onClick={() => handlePageChange(1)}>1</PaginationLink>
                                    </PaginationItem>
                                  )}
                                  
                                  {/* Ellipsis for pages before current */}
                                  {currentPage > 3 && (
                                    <PaginationItem>
                                      <PaginationEllipsis />
                                    </PaginationItem>
                                  )}
                                  
                                  {/* Previous page */}
                                  {currentPage > 1 && (
                                    <PaginationItem>
                                      <PaginationLink onClick={() => handlePageChange(currentPage - 1)}>
                                        {currentPage - 1}
                                      </PaginationLink>
                                    </PaginationItem>
                                  )}
                                  
                                  {/* Current page */}
                                  <PaginationItem>
                                    <PaginationLink isActive>{currentPage}</PaginationLink>
                                  </PaginationItem>
                                  
                                  {/* Next page */}
                                  {currentPage < articlesResponse.pagination.totalPages && (
                                    <PaginationItem>
                                      <PaginationLink onClick={() => handlePageChange(currentPage + 1)}>
                                        {currentPage + 1}
                                      </PaginationLink>
                                    </PaginationItem>
                                  )}
                                  
                                  {/* Ellipsis for pages after current */}
                                  {currentPage < articlesResponse.pagination.totalPages - 2 && (
                                    <PaginationItem>
                                      <PaginationEllipsis />
                                    </PaginationItem>
                                  )}
                                  
                                  {/* Last page */}
                                  {currentPage < articlesResponse.pagination.totalPages - 1 && (
                                    <PaginationItem>
                                      <PaginationLink onClick={() => handlePageChange(articlesResponse.pagination.totalPages)}>
                                        {articlesResponse.pagination.totalPages}
                                      </PaginationLink>
                                    </PaginationItem>
                                  )}
                                  
                                  {currentPage < articlesResponse.pagination.totalPages && (
                                    <PaginationItem>
                                      <PaginationNext onClick={() => handlePageChange(currentPage + 1)} />
                                    </PaginationItem>
                                  )}
                                </PaginationContent>
                              </Pagination>
                            )}
                            
                            {/* Display pagination info */}
                            {articlesResponse && (
                              <div className="text-center text-sm text-muted-foreground mt-2">
                                Showing {filteredArticles.length} of {articlesResponse.pagination.totalItems} articles
                                {articlesResponse.pagination.totalPages > 1 && (
                                  <span> (Page {currentPage} of {articlesResponse.pagination.totalPages})</span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-10 text-center">
                            <p className="text-muted-foreground">
                              No research articles available for this body part.
                            </p>
                          </div>
                        )}
                      </TabsContent>
                    ))
                  )}
                </div>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
      </MembershipRequired>
    </div>
  );
}