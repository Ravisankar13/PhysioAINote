import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Search, 
  Filter, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  BarChart3,
  Lightbulb,
  Users,
  Clock,
  Zap
} from "lucide-react";

interface ResearchGap {
  id: number;
  title: string;
  description: string;
  bodyPart: string;
  gapType: "demographic" | "treatment" | "outcome" | "methodology";
  priority: "low" | "medium" | "high" | "critical";
  evidenceLevel: string;
  potentialImpact: string;
  suggestedMethodology: string;
  aiGenerated: boolean;
  verifiedByExpert: boolean;
  createdAt: string;
}

interface GapStatistics {
  totalGaps: number;
  byPriority: Record<string, number>;
  byBodyPart: Record<string, number>;
  byGapType: Record<string, number>;
}

export default function ResearchGaps() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedGapType, setSelectedGapType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch research gaps
  const { data: gaps = [], isLoading: loadingGaps } = useQuery<ResearchGap[]>({
    queryKey: ["/api/research/gaps", { 
      bodyPart: selectedBodyPart !== "all" ? selectedBodyPart : undefined,
      priority: selectedPriority !== "all" ? selectedPriority : undefined,
      gapType: selectedGapType !== "all" ? selectedGapType : undefined
    }],
  });

  // Fetch gap statistics
  const { data: statistics } = useQuery<GapStatistics>({
    queryKey: ["/api/research/gaps/statistics"],
  });

  // Analyze research gaps mutation
  const analyzeGapsMutation = useMutation({
    mutationFn: async (criteria: { bodyPart?: string; timeframeYears?: number }) => {
      const response = await apiRequest("POST", "/api/research/gaps/analyze", criteria);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research/gaps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/research/gaps/statistics"] });
      toast({
        title: "Research Gaps Analyzed",
        description: "New research gaps have been identified and added to the database.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Unable to analyze research gaps",
        variant: "destructive",
      });
    },
  });

  const handleAnalyzeGaps = () => {
    analyzeGapsMutation.mutate({
      bodyPart: selectedBodyPart !== "all" ? selectedBodyPart : undefined,
      timeframeYears: 10
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-100 text-red-800 border-red-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getGapTypeIcon = (gapType: string) => {
    switch (gapType) {
      case "demographic": return <Users className="h-4 w-4" />;
      case "treatment": return <Target className="h-4 w-4" />;
      case "outcome": return <BarChart3 className="h-4 w-4" />;
      case "methodology": return <Lightbulb className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  const filteredGaps = gaps.filter(gap => 
    gap.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gap.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Research Gap Analysis</h1>
        <p className="text-gray-600">
          Identify critical gaps in physiotherapy research to guide future studies and improve patient outcomes.
        </p>
      </div>

      {/* Statistics Overview */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Search className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Gaps</p>
                  <p className="text-2xl font-bold">{statistics.totalGaps}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Critical Priority</p>
                  <p className="text-2xl font-bold">{statistics.byPriority.critical || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">High Impact</p>
                  <p className="text-2xl font-bold">{statistics.byPriority.high || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Recent</p>
                  <p className="text-2xl font-bold">{gaps.filter(g => 
                    new Date(g.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                  ).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="gaps" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="gaps">Research Gaps</TabsTrigger>
          <TabsTrigger value="analysis">Gap Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="gaps" className="space-y-6">
          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter Research Gaps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <Input
                    placeholder="Search gaps..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Body Part</label>
                  <Select value={selectedBodyPart} onValueChange={setSelectedBodyPart}>
                    <SelectTrigger>
                      <SelectValue placeholder="All body parts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Body Parts</SelectItem>
                      <SelectItem value="shoulder">Shoulder</SelectItem>
                      <SelectItem value="neck">Neck</SelectItem>
                      <SelectItem value="back">Back</SelectItem>
                      <SelectItem value="knee">Knee</SelectItem>
                      <SelectItem value="hip">Hip</SelectItem>
                      <SelectItem value="ankle">Ankle</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Priority</label>
                  <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="All priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Gap Type</label>
                  <Select value={selectedGapType} onValueChange={setSelectedGapType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="demographic">Demographic</SelectItem>
                      <SelectItem value="treatment">Treatment</SelectItem>
                      <SelectItem value="outcome">Outcome</SelectItem>
                      <SelectItem value="methodology">Methodology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Research Gaps Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {loadingGaps ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))
            ) : filteredGaps.length === 0 ? (
              <div className="col-span-full">
                <Card>
                  <CardContent className="p-12 text-center">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No research gaps found</h3>
                    <p className="text-gray-600 mb-4">
                      Try adjusting your filters or run an analysis to identify new gaps.
                    </p>
                    <Button onClick={handleAnalyzeGaps} disabled={analyzeGapsMutation.isPending}>
                      {analyzeGapsMutation.isPending ? "Analyzing..." : "Analyze Research Gaps"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              filteredGaps.map((gap) => (
                <Card key={gap.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg font-semibold pr-4">
                        {gap.title}
                      </CardTitle>
                      <div className="flex flex-col gap-2 items-end">
                        <Badge className={getPriorityColor(gap.priority)}>
                          {gap.priority}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          {getGapTypeIcon(gap.gapType)}
                          <span className="capitalize">{gap.gapType}</span>
                        </div>
                      </div>
                    </div>
                    <CardDescription>
                      Body Part: <span className="font-medium capitalize">{gap.bodyPart}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 mb-4">{gap.description}</p>
                    
                    <Separator className="my-4" />
                    
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-sm text-gray-900">Evidence Level</h4>
                        <p className="text-sm text-gray-600">{gap.evidenceLevel}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm text-gray-900">Potential Impact</h4>
                        <p className="text-sm text-gray-600">{gap.potentialImpact}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm text-gray-900">Suggested Methodology</h4>
                        <p className="text-sm text-gray-600">{gap.suggestedMethodology}</p>
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {gap.aiGenerated && (
                          <Badge variant="outline" className="text-xs">
                            <Zap className="h-3 w-3 mr-1" />
                            AI Generated
                          </Badge>
                        )}
                        {gap.verifiedByExpert && (
                          <Badge variant="outline" className="text-xs">
                            ✓ Expert Verified
                          </Badge>
                        )}
                      </div>
                      <Button variant="outline" size="sm">
                        Start Research Project
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Gap Analysis</CardTitle>
              <CardDescription>
                Use artificial intelligence to analyze existing research literature and identify critical gaps
                in physiotherapy research that could benefit from new studies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Focus Area</label>
                  <Select value={selectedBodyPart} onValueChange={setSelectedBodyPart}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select body part" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Body Parts</SelectItem>
                      <SelectItem value="shoulder">Shoulder</SelectItem>
                      <SelectItem value="neck">Neck</SelectItem>
                      <SelectItem value="back">Back</SelectItem>
                      <SelectItem value="knee">Knee</SelectItem>
                      <SelectItem value="hip">Hip</SelectItem>
                      <SelectItem value="ankle">Ankle</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end">
                  <Button 
                    onClick={handleAnalyzeGaps} 
                    disabled={analyzeGapsMutation.isPending}
                    className="w-full"
                  >
                    {analyzeGapsMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Analyzing Research...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Analyze Research Gaps
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">How It Works</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• AI analyzes {statistics?.totalGaps || 240}+ research papers in our database</li>
                  <li>• Identifies patterns in methodology, demographics, and treatment approaches</li>
                  <li>• Highlights underresearched areas with high clinical impact potential</li>
                  <li>• Suggests specific research methodologies for addressing gaps</li>
                  <li>• Prioritizes gaps based on evidence quality and potential impact</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}