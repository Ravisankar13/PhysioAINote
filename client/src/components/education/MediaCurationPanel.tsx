/**
 * Media Curation Panel
 * 
 * Admin interface for assigning multimedia content to education modules
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Save, 
  Trash2,
  Search,
  Upload,
  Video,
  Image as ImageIcon,
  FileSearch,
  Sparkles,
  Eye,
  X
} from "lucide-react";
import { BIODIGITAL_MODELS } from "./BioDigital3DViewer";

interface MediaCurationPanelProps {
  moduleId: number;
  moduleTitle: string;
  bodyPart?: string;
  currentMediaConfig?: any;
  onSave?: () => void;
}

interface MediaConfig {
  biodigital?: {
    modelId: string;
    viewAngle?: string;
    highlightStructures?: string[];
    labels?: boolean;
  };
  anatomyImages?: Array<{
    imageUrl: string;
    structure: string;
    viewType?: string;
    labels?: string[];
    description?: string;
  }>;
  clinicalImages?: Array<{
    imageUrl: string;
    title: string;
    description?: string;
    imageType?: string;
  }>;
  researchArticles?: Array<{
    articleId: number;
    title: string;
    summary?: string;
  }>;
}

export function MediaCurationPanel({
  moduleId,
  moduleTitle,
  bodyPart = "shoulder",
  currentMediaConfig,
  onSave
}: MediaCurationPanelProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("biodigital");
  const [mediaConfig, setMediaConfig] = useState<MediaConfig>(currentMediaConfig || {});
  
  // BioDigital 3D state
  const [biodigitalModelId, setBiodigitalModelId] = useState(mediaConfig.biodigital?.modelId || "");
  const [biodigitalViewAngle, setBiodigitalViewAngle] = useState(mediaConfig.biodigital?.viewAngle || "default");
  const [biodigitalStructures, setBiodigitalStructures] = useState(mediaConfig.biodigital?.highlightStructures?.join(", ") || "");
  
  // Anatomy images state
  const [anatomyImages, setAnatomyImages] = useState(mediaConfig.anatomyImages || []);
  const [newAnatomyImageUrl, setNewAnatomyImageUrl] = useState("");
  const [newAnatomyStructure, setNewAnatomyStructure] = useState("");
  const [newAnatomyViewType, setNewAnatomyViewType] = useState("anterior");
  
  // Clinical images state
  const [clinicalSearchQuery, setClinicalSearchQuery] = useState("");
  const [selectedClinicalImages, setSelectedClinicalImages] = useState(mediaConfig.clinicalImages || []);
  
  // Research articles state
  const [researchArticles, setResearchArticles] = useState(mediaConfig.researchArticles || []);
  const [newArticleId, setNewArticleId] = useState("");
  const [newArticleTitle, setNewArticleTitle] = useState("");
  
  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (config: MediaConfig) => {
      return await apiRequest(
        `/api/education/modules/${moduleId}/media`,
        'POST',
        config
      );
    },
    onSuccess: () => {
      toast({
        title: "Media Configuration Saved",
        description: "Multimedia content has been updated for this module."
      });
      queryClient.invalidateQueries({ queryKey: [`/api/education/modules/${moduleId}`] });
      onSave?.();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Failed to save media configuration. Please try again."
      });
    }
  });
  
  const handleSaveAll = () => {
    const config: MediaConfig = {};
    
    // Add BioDigital config if configured
    if (biodigitalModelId) {
      config.biodigital = {
        modelId: biodigitalModelId,
        viewAngle: biodigitalViewAngle,
        highlightStructures: biodigitalStructures.split(',').map(s => s.trim()).filter(Boolean),
        labels: true
      };
    }
    
    // Add anatomy images
    if (anatomyImages.length > 0) {
      config.anatomyImages = anatomyImages;
    }
    
    // Add clinical images
    if (selectedClinicalImages.length > 0) {
      config.clinicalImages = selectedClinicalImages;
    }
    
    // Add research articles
    if (researchArticles.length > 0) {
      config.researchArticles = researchArticles;
    }
    
    saveMutation.mutate(config);
  };
  
  const addAnatomyImage = () => {
    if (!newAnatomyImageUrl || !newAnatomyStructure) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide both image URL and structure name"
      });
      return;
    }
    
    setAnatomyImages([...anatomyImages, {
      imageUrl: newAnatomyImageUrl,
      structure: newAnatomyStructure,
      viewType: newAnatomyViewType,
      labels: [],
      description: ""
    }]);
    
    setNewAnatomyImageUrl("");
    setNewAnatomyStructure("");
  };
  
  const removeAnatomyImage = (index: number) => {
    setAnatomyImages(anatomyImages.filter((_, i) => i !== index));
  };
  
  const searchClinicalImages = async () => {
    // In a real implementation, this would call the NIH Open-i service
    toast({
      title: "Searching Clinical Images",
      description: `Searching for: ${clinicalSearchQuery}`
    });
    
    // Mock result for now
    const mockImage = {
      imageUrl: `https://openi.nlm.nih.gov/imgs/${Date.now()}.jpg`,
      title: clinicalSearchQuery,
      description: "Clinical image from NIH Open-i",
      imageType: "xray" as const
    };
    
    setSelectedClinicalImages([...selectedClinicalImages, mockImage]);
  };
  
  const removeClinicalImage = (index: number) => {
    setSelectedClinicalImages(selectedClinicalImages.filter((_, i) => i !== index));
  };
  
  const addResearchArticle = () => {
    if (!newArticleId || !newArticleTitle) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide both article ID and title"
      });
      return;
    }
    
    setResearchArticles([...researchArticles, {
      articleId: parseInt(newArticleId),
      title: newArticleTitle,
      summary: ""
    }]);
    
    setNewArticleId("");
    setNewArticleTitle("");
  };
  
  const removeResearchArticle = (index: number) => {
    setResearchArticles(researchArticles.filter((_, i) => i !== index));
  };
  
  // Get preset models for body part
  const presetModels = BIODIGITAL_MODELS[bodyPart as keyof typeof BIODIGITAL_MODELS] || {};
  
  return (
    <Card className="w-full" data-testid="media-curation-panel">
      <CardHeader>
        <CardTitle>Media Curation</CardTitle>
        <CardDescription>
          Configure multimedia content for: {moduleTitle}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="biodigital" data-testid="tab-biodigital">
              <Eye className="h-4 w-4 mr-2" />
              3D Model
            </TabsTrigger>
            <TabsTrigger value="anatomy" data-testid="tab-anatomy">
              <ImageIcon className="h-4 w-4 mr-2" />
              Anatomy
            </TabsTrigger>
            <TabsTrigger value="clinical" data-testid="tab-clinical">
              <FileSearch className="h-4 w-4 mr-2" />
              Clinical
            </TabsTrigger>
            <TabsTrigger value="research" data-testid="tab-research">
              <Sparkles className="h-4 w-4 mr-2" />
              Research
            </TabsTrigger>
          </TabsList>
          
          {/* BioDigital 3D Configuration */}
          <TabsContent value="biodigital" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="model-select">3D Model</Label>
                <Select value={biodigitalModelId} onValueChange={setBiodigitalModelId}>
                  <SelectTrigger id="model-select" data-testid="select-model">
                    <SelectValue placeholder="Select a 3D model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom Model ID</SelectItem>
                    {Object.entries(presetModels).map(([key, value]) => (
                      <SelectItem key={key} value={value}>
                        {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {biodigitalModelId === "custom" && (
                <div>
                  <Label htmlFor="custom-model">Custom Model ID</Label>
                  <Input
                    id="custom-model"
                    placeholder="Enter BioDigital model ID"
                    value={biodigitalModelId}
                    onChange={(e) => setBiodigitalModelId(e.target.value)}
                    data-testid="input-custom-model"
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="view-angle">Initial View Angle</Label>
                <Select value={biodigitalViewAngle} onValueChange={setBiodigitalViewAngle}>
                  <SelectTrigger id="view-angle" data-testid="select-view">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="anterior">Anterior</SelectItem>
                    <SelectItem value="posterior">Posterior</SelectItem>
                    <SelectItem value="lateral">Lateral</SelectItem>
                    <SelectItem value="medial">Medial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="structures">Highlight Structures (comma-separated)</Label>
                <Input
                  id="structures"
                  placeholder="e.g., deltoid, rotator cuff, biceps"
                  value={biodigitalStructures}
                  onChange={(e) => setBiodigitalStructures(e.target.value)}
                  data-testid="input-structures"
                />
              </div>
            </div>
          </TabsContent>
          
          {/* Anatomy Images Configuration */}
          <TabsContent value="anatomy" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="anatomy-url">Image URL</Label>
                  <Input
                    id="anatomy-url"
                    placeholder="https://..."
                    value={newAnatomyImageUrl}
                    onChange={(e) => setNewAnatomyImageUrl(e.target.value)}
                    data-testid="input-anatomy-url"
                  />
                </div>
                <div>
                  <Label htmlFor="anatomy-structure">Structure Name</Label>
                  <Input
                    id="anatomy-structure"
                    placeholder="e.g., Rotator Cuff"
                    value={newAnatomyStructure}
                    onChange={(e) => setNewAnatomyStructure(e.target.value)}
                    data-testid="input-anatomy-structure"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Select value={newAnatomyViewType} onValueChange={setNewAnatomyViewType}>
                  <SelectTrigger className="w-40" data-testid="select-anatomy-view">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anterior">Anterior</SelectItem>
                    <SelectItem value="posterior">Posterior</SelectItem>
                    <SelectItem value="lateral">Lateral</SelectItem>
                    <SelectItem value="medial">Medial</SelectItem>
                    <SelectItem value="superior">Superior</SelectItem>
                    <SelectItem value="inferior">Inferior</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addAnatomyImage} data-testid="button-add-anatomy">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Image
                </Button>
              </div>
              
              {/* List of added images */}
              {anatomyImages.length > 0 && (
                <div className="space-y-2">
                  <Label>Added Images</Label>
                  {anatomyImages.map((img, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{img.viewType}</Badge>
                        <span className="text-sm">{img.structure}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeAnatomyImage(idx)}
                        data-testid={`button-remove-anatomy-${idx}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Clinical Images Configuration */}
          <TabsContent value="clinical" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search NIH Open-i (e.g., shoulder MRI)"
                  value={clinicalSearchQuery}
                  onChange={(e) => setClinicalSearchQuery(e.target.value)}
                  data-testid="input-clinical-search"
                />
                <Button onClick={searchClinicalImages} data-testid="button-search-clinical">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
              
              <Alert>
                <AlertDescription>
                  Search NIH Open-i database for clinical images. Results will be automatically fetched when the module is viewed.
                </AlertDescription>
              </Alert>
              
              {/* Selected clinical images */}
              {selectedClinicalImages.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Images</Label>
                  {selectedClinicalImages.map((img, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        {img.imageType && (
                          <Badge variant="secondary">{img.imageType.toUpperCase()}</Badge>
                        )}
                        <span className="text-sm">{img.title}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeClinicalImage(idx)}
                        data-testid={`button-remove-clinical-${idx}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Research Articles Configuration */}
          <TabsContent value="research" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="article-id">Article ID</Label>
                  <Input
                    id="article-id"
                    type="number"
                    placeholder="PubMed ID"
                    value={newArticleId}
                    onChange={(e) => setNewArticleId(e.target.value)}
                    data-testid="input-article-id"
                  />
                </div>
                <div>
                  <Label htmlFor="article-title">Article Title</Label>
                  <Input
                    id="article-title"
                    placeholder="Research article title"
                    value={newArticleTitle}
                    onChange={(e) => setNewArticleTitle(e.target.value)}
                    data-testid="input-article-title"
                  />
                </div>
              </div>
              
              <Button onClick={addResearchArticle} data-testid="button-add-article">
                <Plus className="h-4 w-4 mr-2" />
                Add Article
              </Button>
              
              <Alert>
                <AlertDescription>
                  Added research articles will be automatically summarized using AI when the module is viewed.
                </AlertDescription>
              </Alert>
              
              {/* List of articles */}
              {researchArticles.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Articles</Label>
                  {researchArticles.map((article, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">ID: {article.articleId}</Badge>
                        <span className="text-sm">{article.title}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeResearchArticle(idx)}
                        data-testid={`button-remove-article-${idx}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Save button */}
        <div className="mt-6 flex justify-end">
          <Button 
            onClick={handleSaveAll} 
            disabled={saveMutation.isPending}
            data-testid="button-save-media"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Media Configuration"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}