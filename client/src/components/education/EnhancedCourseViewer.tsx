/**
 * Enhanced Course Content Viewer
 * 
 * Displays course modules with rich multimedia content including:
 * - BioDigital 3D models
 * - Z-Anatomy anatomical images
 * - NIH Open-i clinical images
 * - AI-summarized research articles
 * - Original text content
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Eye,
  BookOpen,
  Image as ImageIcon,
  FileSearch,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  Sparkles,
  AlertCircle,
  Loader2
} from "lucide-react";

// Import our new multimedia components
import { BioDigital3DViewer } from "./BioDigital3DViewer";
import { AnatomyImageGallery, type AnatomyImage } from "./AnatomyImageGallery";
import { ClinicalImagesViewer, type ClinicalImage } from "./ClinicalImagesViewer";

import type { ModuleContent, ModuleContentSection } from "@shared/schema";

interface EnhancedCourseViewerProps {
  moduleTitle: string;
  moduleContent: ModuleContent | null;
  bodyPart?: string;
  condition?: string;
  currentModuleIndex: number;
  totalModules: number;
  onNavigate?: (direction: 'prev' | 'next') => void;
  onComplete?: () => void;
  fetchClinicalImages?: (query: string) => Promise<ClinicalImage[]>;
  fetchResearchSummary?: (articleIds: number[]) => Promise<string[]>;
}

export function EnhancedCourseViewer({
  moduleTitle,
  moduleContent,
  bodyPart,
  condition,
  currentModuleIndex,
  totalModules,
  onNavigate,
  onComplete,
  fetchClinicalImages,
  fetchResearchSummary
}: EnhancedCourseViewerProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [researchSummary, setResearchSummary] = useState<string[]>([]);
  const [loadingResearch, setLoadingResearch] = useState(false);
  const [clinicalImages, setClinicalImages] = useState<ClinicalImage[]>([]);
  
  // Extract different content types from module sections
  const extractContent = () => {
    if (!moduleContent || !moduleContent.sections) {
      return {
        textContent: [],
        biodigitalConfig: null,
        anatomyImages: [],
        clinicalImages: [],
        researchArticleIds: []
      };
    }
    
    const textContent: ModuleContentSection[] = [];
    let biodigitalConfig: any = null;
    const anatomyImages: AnatomyImage[] = [];
    const extractedClinicalImages: ClinicalImage[] = [];
    const researchArticleIds: number[] = [];
    
    moduleContent.sections.forEach(section => {
      if (section.type === 'text') {
        textContent.push(section);
      } else if (section.type === 'biodigital_3d' && section.biodigitalConfig) {
        biodigitalConfig = section.biodigitalConfig;
      } else if (section.type === 'anatomy_images' && section.anatomyImages) {
        anatomyImages.push(...section.anatomyImages);
      } else if (section.type === 'clinical_images' && section.clinicalImages) {
        extractedClinicalImages.push(...section.clinicalImages);
      }
      
      if (section.researchSummary?.articleIds) {
        researchArticleIds.push(...section.researchSummary.articleIds);
      }
    });
    
    return {
      textContent,
      biodigitalConfig,
      anatomyImages,
      clinicalImages: extractedClinicalImages,
      researchArticleIds
    };
  };
  
  const {
    textContent,
    biodigitalConfig,
    anatomyImages,
    clinicalImages: extractedClinicalImages,
    researchArticleIds
  } = extractContent();
  
  // Fetch research summaries if available
  useEffect(() => {
    if (researchArticleIds.length > 0 && fetchResearchSummary) {
      loadResearchSummaries();
    }
  }, [researchArticleIds]);
  
  // Auto-fetch clinical images if none provided
  useEffect(() => {
    if (extractedClinicalImages.length === 0 && fetchClinicalImages && (bodyPart || condition)) {
      fetchClinicalImagesData();
    } else if (extractedClinicalImages.length > 0) {
      setClinicalImages(extractedClinicalImages);
    }
  }, [bodyPart, condition]);
  
  const loadResearchSummaries = async () => {
    if (!fetchResearchSummary) return;
    
    setLoadingResearch(true);
    try {
      const summaries = await fetchResearchSummary(researchArticleIds);
      setResearchSummary(summaries);
    } catch (error) {
      console.error('Failed to fetch research summaries:', error);
    } finally {
      setLoadingResearch(false);
    }
  };
  
  const fetchClinicalImagesData = async () => {
    if (!fetchClinicalImages) return;
    
    try {
      const query = [bodyPart, condition].filter(Boolean).join(' ');
      const images = await fetchClinicalImages(query);
      setClinicalImages(images);
    } catch (error) {
      console.error('Failed to fetch clinical images:', error);
    }
  };
  
  // Calculate progress
  const progress = ((currentModuleIndex + 1) / totalModules) * 100;
  
  // Determine which tabs to show based on available content
  const showTabs = {
    overview: biodigitalConfig !== null,
    anatomy: anatomyImages.length > 0,
    clinical: clinicalImages.length > 0 || fetchClinicalImages !== undefined,
    research: researchArticleIds.length > 0,
    content: textContent.length > 0
  };
  
  const availableTabs = Object.entries(showTabs)
    .filter(([_, show]) => show)
    .map(([key]) => key);
  
  // Set initial tab to first available
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [availableTabs]);
  
  return (
    <Card className="w-full" data-testid="enhanced-course-viewer">
      <CardHeader>
        <div className="space-y-4">
          {/* Module title and navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>{moduleTitle}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Module {currentModuleIndex + 1} of {totalModules}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate?.('prev')}
                disabled={currentModuleIndex === 0}
                data-testid="button-prev-module"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate?.('next')}
                disabled={currentModuleIndex >= totalModules - 1}
                data-testid="button-next-module"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          {/* Content metadata */}
          <div className="flex flex-wrap gap-2">
            {bodyPart && (
              <Badge variant="secondary">
                {bodyPart}
              </Badge>
            )}
            {condition && (
              <Badge variant="outline">
                {condition}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              3-5 min
            </Badge>
            {availableTabs.length > 1 && (
              <Badge variant="outline" className="text-xs">
                {availableTabs.length} content types
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {availableTabs.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No content available for this module yet. Check back soon!
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${availableTabs.length}, 1fr)` }}>
              {showTabs.overview && (
                <TabsTrigger value="overview" data-testid="tab-overview">
                  <Eye className="h-4 w-4 mr-2" />
                  3D Overview
                </TabsTrigger>
              )}
              {showTabs.anatomy && (
                <TabsTrigger value="anatomy" data-testid="tab-anatomy">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Anatomy
                </TabsTrigger>
              )}
              {showTabs.clinical && (
                <TabsTrigger value="clinical" data-testid="tab-clinical">
                  <FileSearch className="h-4 w-4 mr-2" />
                  Clinical
                </TabsTrigger>
              )}
              {showTabs.research && (
                <TabsTrigger value="research" data-testid="tab-research">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Research
                </TabsTrigger>
              )}
              {showTabs.content && (
                <TabsTrigger value="content" data-testid="tab-content">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Content
                </TabsTrigger>
              )}
            </TabsList>
            
            {/* 3D Overview Tab */}
            {showTabs.overview && (
              <TabsContent value="overview" className="mt-6">
                {biodigitalConfig ? (
                  <BioDigital3DViewer
                    modelId={biodigitalConfig.modelId}
                    viewAngle={biodigitalConfig.viewAngle}
                    highlightStructures={biodigitalConfig.highlightStructures}
                    showLabels={biodigitalConfig.labels}
                    title="Interactive 3D Anatomy"
                    description="Rotate, zoom, and explore the anatomical structures"
                  />
                ) : (
                  <Alert>
                    <AlertDescription>
                      3D model configuration not available
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            )}
            
            {/* Anatomy Images Tab */}
            {showTabs.anatomy && (
              <TabsContent value="anatomy" className="mt-6">
                <AnatomyImageGallery
                  images={anatomyImages}
                  title="Detailed Anatomical Views"
                  currentStructure={bodyPart}
                />
              </TabsContent>
            )}
            
            {/* Clinical Images Tab */}
            {showTabs.clinical && (
              <TabsContent value="clinical" className="mt-6">
                <ClinicalImagesViewer
                  images={clinicalImages}
                  title="Clinical Images"
                  showSearch={true}
                  onSearchImages={fetchClinicalImages}
                  bodyPart={bodyPart}
                  condition={condition}
                />
              </TabsContent>
            )}
            
            {/* Research Tab */}
            {showTabs.research && (
              <TabsContent value="research" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                      AI-Summarized Research
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingResearch ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="ml-2">Loading research summaries...</span>
                      </div>
                    ) : researchSummary.length > 0 ? (
                      <div className="space-y-3">
                        {researchSummary.map((point, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm">{point}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No research summaries available
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
            
            {/* Text Content Tab */}
            {showTabs.content && (
              <TabsContent value="content" className="mt-6">
                <div className="space-y-4">
                  {textContent.map((section, idx) => (
                    <Card key={idx}>
                      {section.title && (
                        <CardHeader>
                          <CardTitle className="text-lg">{section.title}</CardTitle>
                        </CardHeader>
                      )}
                      <CardContent>
                        <div 
                          className="prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: section.content || '' }}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        )}
        
        {/* Complete button */}
        {onComplete && (
          <div className="mt-6 flex justify-end">
            <Button onClick={onComplete} data-testid="button-complete">
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Module Complete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}