import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, BookOpen, Info, Award, Calendar, Users, Video, Play, Clock, CheckCircle, AlertCircle, Loader2, Search, Database, Globe } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

interface YouTubeVideoInfo {
  title: string;
  channel: string;
  duration: number;
  publishDate: string;
}

interface VideoAnalysisResult {
  id: string;
  videoInfo: YouTubeVideoInfo;
  transcript: string;
  clinicalAnalysis: {
    conditionIdentified: string;
    bodyPartsInvolved: string[];
    treatmentTechniques: string[];
    assessmentMethods: string[];
    clinicalReasoning: string;
    safetyConsiderations: string[];
  };
  relatedResearch: Array<{
    title: string;
    relevanceScore: number;
    keyPoints: string[];
    bodyPart: string;
  }>;
  treatmentRecommendations: {
    evidenceBasedAlternatives: string[];
    bestPractices: string[];
    contraindications: string[];
  };
  educationalValue: {
    learningPoints: string[];
    skillsDemonstrated: string[];
    clinicalReasoningInsights: string[];
  };
  timestamp: string;
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

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function LiveResearchSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDatabase, setSelectedDatabase] = useState("all");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search query",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      let endpoint = "/api/research/search-all";
      let params = { query: searchQuery, maxResultsPerSource: 10 };
      
      if (selectedDatabase !== "all") {
        endpoint = `/api/research/${selectedDatabase}`;
        params = { query: searchQuery, maxResults: 20 };
      }

      const url = new URL(endpoint, window.location.origin);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
      
      const response = await fetch(url.toString(), {
        method: "GET",
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      setSearchResults(data.data || data || []);
      
      const resultsArray = data.data || data || [];
      if (resultsArray.length === 0) {
        toast({
          title: "No results",
          description: "No articles found matching your search query",
        });
      } else {
        toast({
          title: "Search complete",
          description: `Found ${resultsArray.length} articles from ${selectedDatabase === 'all' ? 'multiple databases' : selectedDatabase}`,
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: "Failed to search research databases. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const saveArticles = async () => {
    if (searchResults.length === 0) return;

    try {
      await apiRequest("POST", "/api/research/save", { articles: searchResults });

      toast({
        title: "Success",
        description: `Saved ${searchResults.length} articles to your database`,
      });

      // Refresh the saved articles
      queryClient.invalidateQueries({ queryKey: ["/api/research"] });
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Save failed",
        description: "Failed to save articles. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Live Research Database Search
        </CardTitle>
        <CardDescription>
          Search real-time physiotherapy research from PubMed, CrossRef, and Semantic Scholar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Controls */}
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search-query">Search Query</Label>
              <Input
                id="search-query"
                placeholder="e.g., rotator cuff rehabilitation, knee osteoarthritis exercise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="w-48">
              <Label htmlFor="database">Database</Label>
              <Select value={selectedDatabase} onValueChange={setSelectedDatabase}>
                <SelectTrigger id="database">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Databases</SelectItem>
                  <SelectItem value="pubmed">PubMed</SelectItem>
                  <SelectItem value="crossref">CrossRef</SelectItem>
                  <SelectItem value="semantic-scholar">Semantic Scholar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleSearch} 
              disabled={isSearching || !searchQuery.trim()}
              className="flex items-center gap-2"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Search
                </>
              )}
            </Button>
            
            {searchResults.length > 0 && (
              <Button 
                onClick={saveArticles}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                Save {searchResults.length} Articles
              </Button>
            )}
          </div>
        </div>

        {/* Info Alert */}
        {!hasSearched && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Search for the latest physiotherapy research from multiple academic databases. 
              Results are fetched in real-time and can be saved to your local database for offline access.
            </AlertDescription>
          </Alert>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Search Results ({searchResults.length})
              </h3>
              <div className="flex gap-2">
                {selectedDatabase === 'all' && (
                  <>
                    <Badge variant="outline">PubMed</Badge>
                    <Badge variant="outline">CrossRef</Badge>
                    <Badge variant="outline">Semantic Scholar</Badge>
                  </>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              {searchResults.map((article, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <h4 className="font-semibold text-sm leading-tight flex-1">
                        {article.title}
                      </h4>
                      <Badge variant="secondary" className="shrink-0">
                        {article.source}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      {article.authors} • {article.journal} • {article.year}
                    </p>
                    
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {article.abstract}
                    </p>
                    
                    {article.keyFindings && article.keyFindings.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs font-semibold mb-1">Key Findings:</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {article.keyFindings.slice(0, 2).map((finding: string, i: number) => (
                            <li key={i} className="line-clamp-1">• {finding}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {article.tags && article.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap pt-2">
                        {article.tags.map((tag: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 pt-2">
                      <a 
                        href={article.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Article
                      </a>
                      {article.doi && (
                        <span className="text-xs text-muted-foreground">
                          DOI: {article.doi}
                        </span>
                      )}
                      {article.citationCount && (
                        <span className="text-xs text-muted-foreground">
                          {article.citationCount} citations
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {hasSearched && searchResults.length === 0 && !isSearching && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No articles found matching your search query.</p>
            <p className="text-sm mt-2">Try different keywords or search in a specific database.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VideoAnalysisComponent() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [analysisResult, setAnalysisResult] = useState<VideoAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [validationResult, setValidationResult] = useState<{valid: boolean, videoInfo?: YouTubeVideoInfo, error?: string} | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Validate YouTube URL
  const validateUrl = async () => {
    if (!youtubeUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a YouTube URL to validate",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest("/api/youtube/validate", {
        method: "POST",
        body: { url: youtubeUrl }
      });

      if (response.valid) {
        setValidationResult({
          valid: true,
          videoInfo: response.videoInfo
        });
        toast({
          title: "Valid YouTube URL",
          description: "Video is accessible and ready for analysis",
        });
      }
    } catch (error: any) {
      setValidationResult({
        valid: false,
        error: error.message || "Invalid YouTube URL"
      });
      toast({
        title: "Invalid URL",
        description: error.message || "This YouTube video cannot be analyzed",
        variant: "destructive",
      });
    }
  };

  // Analyze YouTube video
  const analyzeVideo = async () => {
    if (!youtubeUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a YouTube URL to analyze",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await apiRequest("/api/youtube/analyze", {
        method: "POST",
        body: { url: youtubeUrl }
      });

      if (response.success) {
        setAnalysisResult(response.analysis);
        toast({
          title: "Analysis Complete",
          description: "YouTube video has been successfully analyzed",
        });
      }
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze YouTube video",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearAnalysis = () => {
    setAnalysisResult(null);
    setValidationResult(null);
    setYoutubeUrl("");
  };

  return (
    <div className="space-y-6">
      {/* URL Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            YouTube Video Analysis
          </CardTitle>
          <CardDescription>
            Analyze clinical videos from YouTube to extract educational insights and correlate with research evidence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="youtube-url">YouTube Video URL</Label>
            <div className="flex gap-2">
              <Input
                id="youtube-url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="flex-1"
              />
              <Button 
                variant="outline" 
                onClick={validateUrl}
                disabled={!youtubeUrl.trim()}
              >
                Validate
              </Button>
            </div>
          </div>

          {/* Validation Result */}
          {validationResult && (
            <Alert className={validationResult.valid ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <div className="flex items-center gap-2">
                {validationResult.valid ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  {validationResult.valid ? (
                    <div>
                      <p className="font-medium text-green-800">Video is valid and accessible</p>
                      {validationResult.videoInfo && (
                        <div className="mt-2 text-sm text-green-700">
                          <p><strong>Title:</strong> {validationResult.videoInfo.title}</p>
                          <p><strong>Channel:</strong> {validationResult.videoInfo.channel}</p>
                          <p><strong>Duration:</strong> {formatDuration(validationResult.videoInfo.duration)}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-red-800">{validationResult.error}</p>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Analysis Button */}
          <div className="flex gap-2">
            <Button 
              onClick={analyzeVideo}
              disabled={!youtubeUrl.trim() || isAnalyzing}
              className="flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Analyze Video
                </>
              )}
            </Button>
            {analysisResult && (
              <Button variant="outline" onClick={clearAnalysis}>
                Clear Results
              </Button>
            )}
          </div>

          {/* Progress indicator */}
          {isAnalyzing && (
            <Alert className="border-blue-200 bg-blue-50">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium text-blue-800">Analyzing video content...</p>
                  <p className="text-sm text-blue-700">This may take 2-3 minutes to complete audio transcription and AI analysis</p>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Video Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Video Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Title</h4>
                  <p className="text-sm">{analysisResult.videoInfo.title}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Channel</h4>
                  <p className="text-sm">{analysisResult.videoInfo.channelName}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Duration</h4>
                  <p className="text-sm">{formatDuration(analysisResult.videoInfo.duration)}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Published</h4>
                  <p className="text-sm">{analysisResult.videoInfo.publishDate}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Clinical Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Clinical Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Condition Identified</h4>
                <p className="text-sm">{analysisResult.clinicalAnalysis.conditionIdentified}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Body Parts Involved</h4>
                <div className="flex flex-wrap gap-1">
                  {analysisResult.clinicalAnalysis.bodyPartsInvolved.map((part, index) => (
                    <Badge key={index} variant="secondary">{part}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Treatment Techniques</h4>
                <ul className="text-sm space-y-1">
                  {analysisResult.clinicalAnalysis.treatmentTechniques.map((technique, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-blue-600">•</span>
                      {technique}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Assessment Methods</h4>
                <ul className="text-sm space-y-1">
                  {analysisResult.clinicalAnalysis.assessmentMethods.map((method, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-green-600">•</span>
                      {method}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Clinical Reasoning</h4>
                <p className="text-sm">{analysisResult.clinicalAnalysis.clinicalReasoning}</p>
              </div>

              {analysisResult.clinicalAnalysis.safetyConsiderations.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Safety Considerations</h4>
                  <ul className="text-sm space-y-1">
                    {analysisResult.clinicalAnalysis.safetyConsiderations.map((safety, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-red-600">•</span>
                        {safety}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Educational Value */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Educational Value
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Learning Points</h4>
                <ul className="text-sm space-y-1">
                  {analysisResult.educationalValue.learningPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-blue-600">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Skills Demonstrated</h4>
                <ul className="text-sm space-y-1">
                  {analysisResult.educationalValue.skillsDemonstrated.map((skill, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-green-600">•</span>
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Clinical Reasoning Insights</h4>
                <ul className="text-sm space-y-1">
                  {analysisResult.educationalValue.clinicalReasoningInsights.map((insight, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-purple-600">•</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Related Research */}
          {analysisResult.relatedResearch.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Related Research
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysisResult.relatedResearch.map((research, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{research.title}</h4>
                          <Badge variant="outline" className="mt-1">
                            {research.bodyPart} • {research.relevanceScore}% relevant
                          </Badge>
                        </div>
                      </div>
                      <ul className="mt-2 text-sm space-y-1">
                        {research.keyPoints.map((point, pointIndex) => (
                          <li key={pointIndex} className="flex items-start gap-1">
                            <span className="text-blue-600">•</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Treatment Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Treatment Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Evidence-Based Alternatives</h4>
                <ul className="text-sm space-y-1">
                  {analysisResult.treatmentRecommendations.evidenceBasedAlternatives.map((alt, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-green-600">•</span>
                      {alt}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Best Practices</h4>
                <ul className="text-sm space-y-1">
                  {analysisResult.treatmentRecommendations.bestPractices.map((practice, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-blue-600">•</span>
                      {practice}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Contraindications</h4>
                <ul className="text-sm space-y-1">
                  {analysisResult.treatmentRecommendations.contraindications.map((contra, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-red-600">•</span>
                      {contra}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Video Transcript */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Video Transcript
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-60 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                <p className="text-sm whitespace-pre-wrap">{analysisResult.transcript}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
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

  // For storing all articles from all body parts when searching
  const [allArticles, setAllArticles] = useState<ResearchArticle[]>([]);

  // When tab changes, articles load, or pagination changes
  useEffect(() => {
    if (articlesResponse) {
      // Get articles for the current page
      setFilteredArticles(articlesResponse.data);
    }
  }, [selectedTab, articlesResponse]);
  
  // Handle search - search across ALL body parts
  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim()) {
        const searchTermLower = searchQuery.toLowerCase();
        
        try {
          // If we don't have all articles yet, fetch them all
          if (allArticles.length === 0) {
            const allArticlesResponse = await fetch('/api/research?all=true');
            if (!allArticlesResponse.ok) {
              throw new Error('Failed to fetch all articles');
            }
            const data = await allArticlesResponse.json();
            setAllArticles(data.data || []);
            
            // Filter the newly fetched articles
            const matchingArticles = data.data.filter((article: ResearchArticle) => 
              article.title.toLowerCase().includes(searchTermLower) ||
              article.abstract.toLowerCase().includes(searchTermLower) ||
              article.authors.toLowerCase().includes(searchTermLower) ||
              article.journal.toLowerCase().includes(searchTermLower) ||
              article.keyFindings?.toLowerCase().includes(searchTermLower) ||
              article.clinicalRelevance?.toLowerCase().includes(searchTermLower)
            );
            setSearchResults(matchingArticles);
          } else {
            // Use existing all articles
            const matchingArticles = allArticles.filter(article => 
              article.title.toLowerCase().includes(searchTermLower) ||
              article.abstract.toLowerCase().includes(searchTermLower) ||
              article.authors.toLowerCase().includes(searchTermLower) ||
              article.journal.toLowerCase().includes(searchTermLower) ||
              article.keyFindings?.toLowerCase().includes(searchTermLower) ||
              article.clinicalRelevance?.toLowerCase().includes(searchTermLower)
            );
            setSearchResults(matchingArticles);
          }
        } catch (error) {
          console.error('Error searching articles:', error);
          toast({
            title: "Search failed",
            description: "Could not search across all articles. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        setSearchResults([]);
      }
    };
    
    performSearch();
  }, [searchQuery, toast, allArticles]);
  
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
              Browse peer-reviewed research articles and analyze clinical videos
            </p>
          </div>
        
        <Tabs defaultValue="live-search" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
            <TabsTrigger value="live-search">Live Search</TabsTrigger>
            <TabsTrigger value="articles">Saved Articles</TabsTrigger>
            <TabsTrigger value="video-analysis">Video Analysis</TabsTrigger>
          </TabsList>
          
          <TabsContent value="articles">
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
          </TabsContent>
          
          <TabsContent value="live-search">
            <LiveResearchSearch />
          </TabsContent>
          
          <TabsContent value="video-analysis">
            <VideoAnalysisComponent />
          </TabsContent>
        </Tabs>
      </div>
      </MembershipRequired>
    </div>
  );
}