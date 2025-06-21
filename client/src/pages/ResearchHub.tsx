import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ExternalLink, 
  BookOpen, 
  Info, 
  Award, 
  Calendar, 
  Users,
  Upload,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  RefreshCw,
  Bookmark,
  BookmarkCheck,
  Lightbulb,
  BarChart3,
  FileText,
  Search,
  Filter,
  Download
} from "lucide-react";
import MembershipRequired from "@/components/MembershipRequired";
import { FollowUpQuestions } from "@/components/research/FollowUpQuestions";
import { apiRequest } from "@/lib/queryClient";

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
  methodology?: string;
  // AI Analysis fields
  aiAnalysisStatus: 'pending' | 'analyzing' | 'completed' | 'failed';
  qualityScore?: number;
  identifiedGaps?: {
    methodology: string[];
    statistical: string[];
    clinical: string[];
    bias: string[];
  };
  generatedQuestions?: {
    critical: string[];
    moderate: string[];
    minor: string[];
  };
  biasAssessment?: {
    selectionBias: { score: number; notes: string };
    performanceBias: { score: number; notes: string };
    detectionBias: { score: number; notes: string };
    attritionBias: { score: number; notes: string };
    reportingBias: { score: number; notes: string };
  };
  methodologyAssessment?: {
    sampleSizeAdequacy: { score: number; notes: string };
    studyDesign: { score: number; notes: string };
    outcomeValidation: { score: number; notes: string };
    followUpDuration: { score: number; notes: string };
    statisticalMethods: { score: number; notes: string };
  };
  followUpQuestions?: {
    methodological: Array<{ question: string; priority: number; feasibilityScore: number; rationale: string }>;
    population: Array<{ question: string; priority: number; feasibilityScore: number; rationale: string }>;
    intervention: Array<{ question: string; priority: number; feasibilityScore: number; rationale: string }>;
    outcomes: Array<{ question: string; priority: number; feasibilityScore: number; rationale: string }>;
    mechanisms: Array<{ question: string; priority: number; feasibilityScore: number; rationale: string }>;
  };
  aiAnalyzedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ResearchDiscussion {
  id: number;
  articleId: number;
  userId: number;
  parentId?: number;
  content: string;
  questionType?: string;
  isExpertVerified: boolean;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  updatedAt: string;
  user: {
    username: string;
  };
  replies?: ResearchDiscussion[];
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

function QualityScoreBadge({ score }: { score?: number }) {
  if (!score) return null;
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "High Quality";
    if (score >= 60) return "Moderate Quality";
    return "Needs Review";
  };

  return (
    <Badge className={getScoreColor(score)}>
      {getScoreLabel(score)} ({score}/100)
    </Badge>
  );
}

function GapAnalysisPanel({ article }: { article: ResearchArticle }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Individual article analysis trigger
  const analyzeArticleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/research/test-analysis");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "AI analysis started - processing in background" });
      
      // Set up automatic refresh after a delay
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/research"] });
        toast({ title: "Checking for analysis completion..." });
      }, 8000);
      
      // Additional refresh after longer delay
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/research"] });
        toast({ title: "Analysis should be completed - refreshing results" });
      }, 20000);
    },
    onError: () => {
      toast({ title: "Analysis initiated - refresh page in a few moments", variant: "default" });
      queryClient.invalidateQueries({ queryKey: ["/api/research"] });
    },
  });

  if (article.aiAnalysisStatus !== 'completed' || !article.identifiedGaps) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Gap Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {article.aiAnalysisStatus === 'pending' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                Analysis pending
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => analyzeArticleMutation.mutate()}
                  disabled={analyzeArticleMutation.isPending}
                  size="sm"
                  className="flex-1"
                >
                  {analyzeArticleMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Start AI Analysis
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/research"] })}
                  size="sm"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          {article.aiAnalysisStatus === 'analyzing' && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Analyzing...
            </div>
          )}
          {article.aiAnalysisStatus === 'failed' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                Analysis failed
              </div>
              <Button 
                onClick={() => analyzeArticleMutation.mutate()}
                disabled={analyzeArticleMutation.isPending}
                size="sm"
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Analysis
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Gap Analysis
        </CardTitle>
        <div className="flex items-center gap-2">
          <QualityScoreBadge score={article.qualityScore} />
          <Badge variant="outline" className="bg-green-50 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Analyzed
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="gaps" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="gaps">Identified Gaps</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="followup">Follow-up Research</TabsTrigger>
            <TabsTrigger value="bias">Bias Assessment</TabsTrigger>
            <TabsTrigger value="methodology">Methodology</TabsTrigger>
          </TabsList>
          
          <TabsContent value="gaps" className="space-y-3">
            {Object.entries(article.identifiedGaps).map(([category, gaps]) => (
              <div key={category}>
                <h5 className="font-medium text-sm capitalize mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  {category} Gaps
                </h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {gaps.map((gap, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="w-1 h-1 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </TabsContent>
          
          <TabsContent value="questions" className="space-y-3">
            {article.generatedQuestions && Object.entries(article.generatedQuestions).map(([priority, questions]) => (
              <div key={priority}>
                <h5 className="font-medium text-sm capitalize mb-2 flex items-center gap-1">
                  <Lightbulb className="h-4 w-4" />
                  {priority} Questions
                </h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {questions.map((question, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className={`w-1 h-1 rounded-full mt-2 flex-shrink-0 ${
                        priority === 'critical' ? 'bg-red-500' : 
                        priority === 'moderate' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></span>
                      {question}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </TabsContent>
          
          <TabsContent value="bias" className="space-y-3">
            {article.biasAssessment && Object.entries(article.biasAssessment).map(([biasType, assessment]) => (
              <div key={biasType} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-sm capitalize">
                    {biasType.replace(/([A-Z])/g, ' $1').trim()}
                  </h5>
                  <Badge variant="outline">
                    {assessment.score}/10
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{assessment.notes}</p>
              </div>
            ))}
          </TabsContent>
          
          <TabsContent value="methodology" className="space-y-3">
            {article.methodologyAssessment && Object.entries(article.methodologyAssessment).map(([aspect, assessment]) => (
              <div key={aspect} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-sm capitalize">
                    {aspect.replace(/([A-Z])/g, ' $1').trim()}
                  </h5>
                  <Badge variant="outline">
                    {assessment.score}/10
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{assessment.notes}</p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function DiscussionPanel({ articleId }: { articleId: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const { data: discussions = [], isLoading } = useQuery<ResearchDiscussion[]>({
    queryKey: [`/api/research/${articleId}/discussions`],
  });

  const addDiscussionMutation = useMutation({
    mutationFn: async (data: { content: string; parentId?: number }) => {
      const response = await apiRequest("POST", `/api/research/${articleId}/discussions`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/research/${articleId}/discussions`] });
      setNewComment("");
      setReplyContent("");
      setReplyTo(null);
      toast({ title: "Comment added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add comment", variant: "destructive" });
    },
  });

  const voteDiscussionMutation = useMutation({
    mutationFn: async (data: { discussionId: number; voteType: 'up' | 'down' }) => {
      const response = await apiRequest("POST", `/api/research/discussions/${data.discussionId}/vote`, {
        voteType: data.voteType
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/research/${articleId}/discussions`] });
    },
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    addDiscussionMutation.mutate({ content: newComment });
  };

  const handleSubmitReply = (parentId: number) => {
    if (!replyContent.trim()) return;
    addDiscussionMutation.mutate({ content: replyContent, parentId });
  };

  if (!user) {
    return (
      <Card className="mt-4">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please log in to participate in discussions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Research Discussion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new comment */}
        <div className="space-y-2">
          <Textarea
            placeholder="Share your thoughts on this research..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[100px]"
          />
          <Button 
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || addDiscussionMutation.isPending}
          >
            Add Comment
          </Button>
        </div>

        <Separator />

        {/* Discussion threads */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : discussions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No discussions yet. Be the first to share your thoughts!
            </p>
          ) : (
            <div className="space-y-4">
              {discussions.filter(d => !d.parentId).map((discussion) => (
                <div key={discussion.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{discussion.user.username}</span>
                      {discussion.isExpertVerified && (
                        <Badge variant="outline" className="text-xs">Expert</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(discussion.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => voteDiscussionMutation.mutate({
                          discussionId: discussion.id,
                          voteType: 'up'
                        })}
                      >
                        <ThumbsUp className="h-3 w-3" />
                        {discussion.upvotes}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => voteDiscussionMutation.mutate({
                          discussionId: discussion.id,
                          voteType: 'down'
                        })}
                      >
                        <ThumbsDown className="h-3 w-3" />
                        {discussion.downvotes}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm mb-3">{discussion.content}</p>
                  
                  {/* Reply section */}
                  {replyTo === discussion.id ? (
                    <div className="space-y-2 border-t pt-3">
                      <Textarea
                        placeholder="Write your reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="min-h-[80px]"
                      />
                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={() => handleSubmitReply(discussion.id)}
                          disabled={!replyContent.trim()}
                        >
                          Reply
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setReplyTo(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setReplyTo(discussion.id)}
                    >
                      Reply
                    </Button>
                  )}

                  {/* Show replies */}
                  {discussion.replies && discussion.replies.length > 0 && (
                    <div className="mt-4 space-y-3 border-l-2 border-gray-200 pl-4">
                      {discussion.replies.map((reply) => (
                        <div key={reply.id} className="bg-gray-50 rounded p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{reply.user.username}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(reply.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ArticleCard({ article }: { article: ResearchArticle }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showDiscussion, setShowDiscussion] = useState(false);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap gap-2 mb-2">
          <Badge variant="outline" className={bodyPartInfo[article.bodyPart as BodyPartKey]?.color || "bg-gray-100"}>
            {bodyPartInfo[article.bodyPart as BodyPartKey]?.name || article.bodyPart}
          </Badge>
          <QualityScoreBadge score={article.qualityScore} />
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
            {new Date(article.publicationDate).toLocaleDateString()}
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
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAnalysis(!showAnalysis)}
              >
                <Brain className="h-4 w-4 mr-1" />
                AI Analysis
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowDiscussion(!showDiscussion)}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Discussion
              </Button>
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

          {showAnalysis && <GapAnalysisPanel article={article} />}
          {showDiscussion && <DiscussionPanel articleId={article.id} />}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResearchHub() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<BodyPartKey>("general");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [qualityFilter, setQualityFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Fetch research articles with filters
  const { data: articlesResponse, isLoading } = useQuery<{
    data: ResearchArticle[],
    pagination: {
      page: number,
      pageSize: number,
      totalItems: number,
      totalPages: number
    }
  }>({
    queryKey: ["/api/research", selectedTab, currentPage, pageSize, searchQuery, qualityFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        bodyPart: selectedTab,
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        ...(searchQuery && { search: searchQuery }),
        ...(qualityFilter !== 'all' && { qualityFilter })
      });
      const response = await fetch(`/api/research?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch research articles');
      }
      return response.json();
    }
  });

  // Trigger AI analysis for pending articles
  const triggerAnalysisMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/research/trigger-analysis");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "AI analysis started for pending articles" });
      queryClient.invalidateQueries({ queryKey: ["/api/research"] });
    },
    onError: () => {
      toast({ title: "Failed to start analysis", variant: "destructive" });
    },
  });

  return (
    <div className="container max-w-7xl py-8 mx-auto">
      <Helmet>
        <title>Research Hub | PhysioAI</title>
        <meta name="description" content="Collaborative research hub with AI-powered gap analysis for physiotherapy literature." />
      </Helmet>
      
      <MembershipRequired feature="research">
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Research Hub</h1>
            <p className="text-muted-foreground mt-1">
              Collaborative research platform with AI-powered gap analysis and peer discussions
            </p>
          </div>

          {/* Research Hub Tabs */}
          <Tabs defaultValue="browse" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="browse">Browse Research</TabsTrigger>
              <TabsTrigger value="upload">Upload & Analyze</TabsTrigger>
              <TabsTrigger value="insights">AI Insights</TabsTrigger>
              <TabsTrigger value="discussions">Discussions</TabsTrigger>
            </TabsList>

            {/* Browse Research Tab */}
            <TabsContent value="browse" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Research Articles</CardTitle>
                      <CardDescription>
                        Browse AI-analyzed research with gap analysis and peer discussions
                      </CardDescription>
                    </div>
                    {user && (
                      <Button
                        onClick={() => triggerAnalysisMutation.mutate()}
                        disabled={triggerAnalysisMutation.isPending}
                        variant="outline"
                      >
                        <Brain className="h-4 w-4 mr-2" />
                        {triggerAnalysisMutation.isPending ? "Analyzing..." : "Run AI Analysis"}
                      </Button>
                    )}
                  </div>
                  
                  {/* Search and Filters */}
                  <div className="flex gap-4 mt-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Search articles by title, author, content..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <select
                      value={qualityFilter}
                      onChange={(e) => setQualityFilter(e.target.value)}
                      className="px-3 py-2 border rounded-md"
                    >
                      <option value="all">All Quality Levels</option>
                      <option value="high">High Quality (80+)</option>
                      <option value="moderate">Moderate Quality (60-79)</option>
                      <option value="low">Needs Review (below 60)</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Body Part Tabs */}
                  <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as BodyPartKey)}>
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
                        {articlesResponse?.data.length ? (
                          <div className="space-y-6">
                            {articlesResponse.data.map((article) => (
                              <ArticleCard key={article.id} article={article} />
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-10">
                            <p className="text-muted-foreground">No articles found</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Upload & Analyze Tab */}
            <TabsContent value="upload" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Research Paper
                  </CardTitle>
                  <CardDescription>
                    Upload a PDF research paper for AI-powered gap analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium mb-2">Upload Research Paper</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Drag and drop a PDF file here, or click to browse
                    </p>
                    <Button>Choose File</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Insights Tab */}
            <TabsContent value="insights" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Quality Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">High Quality</span>
                        <span className="text-sm font-medium">34%</span>
                      </div>
                      <Progress value={34} className="h-2" />
                      <div className="flex justify-between">
                        <span className="text-sm">Moderate Quality</span>
                        <span className="text-sm font-medium">48%</span>
                      </div>
                      <Progress value={48} className="h-2" />
                      <div className="flex justify-between">
                        <span className="text-sm">Needs Review</span>
                        <span className="text-sm font-medium">18%</span>
                      </div>
                      <Progress value={18} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Common Gaps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        Sample size calculations
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                        Blinding procedures
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                        Long-term follow-up
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        Effect size reporting
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Analysis Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Analyzed</span>
                        <Badge className="bg-green-100 text-green-800">245</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Pending</span>
                        <Badge className="bg-yellow-100 text-yellow-800">12</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Processing</span>
                        <Badge className="bg-blue-100 text-blue-800">3</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Discussions Tab */}
            <TabsContent value="discussions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Active Discussions
                  </CardTitle>
                  <CardDescription>
                    Join ongoing conversations about research quality and methodology
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium mb-2">No active discussions</p>
                    <p className="text-sm text-muted-foreground">
                      Start a discussion by commenting on a research article
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </MembershipRequired>
    </div>
  );
}