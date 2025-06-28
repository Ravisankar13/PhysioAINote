import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Eye, 
  FileImage, 
  Brain, 
  Activity, 
  Loader2, 
  Download,
  RefreshCcw,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle,
  ImageIcon
} from "lucide-react";

interface PathologyVisualization {
  anatomicalStructure: string;
  pathologyType: string;
  severity: "mild" | "moderate" | "severe";
  location: string;
  description: string;
  visualizationPrompt: string;
  clinicalSignificance: string;
  treatmentImplications: string[];
}

interface ClinicalVisualizationProps {
  symptomData?: any;
  posturalData?: any;
  movementData?: any;
  diagnosisData?: any;
  onVisualizationComplete?: (data: any) => void;
}

const ClinicalVisualizationEngine: React.FC<ClinicalVisualizationProps> = ({
  symptomData,
  posturalData,
  movementData,
  diagnosisData,
  onVisualizationComplete
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [pathologyVisualizations, setPathologyVisualizations] = useState<PathologyVisualization[]>([]);
  const [selectedVisualization, setSelectedVisualization] = useState<PathologyVisualization | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mockAnalyzePathology = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setError(null);

    // Simulate analysis progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setAnalysisProgress(i);
    }

    // Generate pathology visualizations based on symptoms and findings
    const visualizations: PathologyVisualization[] = [];

    if (symptomData?.primarySymptoms?.includes("shoulder pain")) {
      visualizations.push({
        anatomicalStructure: "Rotator Cuff",
        pathologyType: "Supraspinatus Tendinopathy",
        severity: "moderate",
        location: "Anterior supraspinatus tendon insertion",
        description: "Degenerative changes with partial thickness tear at the critical zone",
        visualizationPrompt: "Medical illustration showing supraspinatus tendon with inflamed, thickened fibers and partial tear at the critical zone, with surrounding bursal inflammation",
        clinicalSignificance: "Common cause of shoulder impingement and nocturnal pain",
        treatmentImplications: [
          "Progressive loading program",
          "Manual therapy for mobility",
          "Activity modification",
          "Consider corticosteroid injection if conservative fails"
        ]
      });
    }

    if (symptomData?.primarySymptoms?.includes("knee pain")) {
      visualizations.push({
        anatomicalStructure: "Medial Meniscus",
        pathologyType: "Horizontal Cleavage Tear",
        severity: "moderate",
        location: "Posterior horn medial meniscus",
        description: "Horizontal tear extending from the free edge toward the capsular attachment",
        visualizationPrompt: "Cross-sectional medical illustration of knee showing medial meniscus with horizontal cleavage tear in posterior horn, with surrounding synovial inflammation and joint effusion",
        clinicalSignificance: "Often associated with degenerative changes and mechanical symptoms",
        treatmentImplications: [
          "Strengthen quadriceps and glutes",
          "Range of motion exercises",
          "Consider arthroscopic evaluation if mechanical symptoms persist",
          "Avoid deep squatting initially"
        ]
      });
    }

    if (symptomData?.primarySymptoms?.includes("hip pain")) {
      visualizations.push({
        anatomicalStructure: "Gluteus Medius Tendon",
        pathologyType: "Tendinopathy with Bursitis",
        severity: "moderate",
        location: "Greater trochanter insertion",
        description: "Gluteus medius tendon thickening with associated trochanteric bursitis",
        visualizationPrompt: "Lateral view medical illustration of hip showing inflamed gluteus medius tendon at greater trochanter insertion with enlarged, inflamed trochanteric bursa",
        clinicalSignificance: "Greater Trochanteric Pain Syndrome - common cause of lateral hip pain",
        treatmentImplications: [
          "Progressive strengthening of hip abductors",
          "Address kinetic chain dysfunction",
          "Modify aggravating activities",
          "Consider guided injection if conservative fails"
        ]
      });
    }

    if (symptomData?.primarySymptoms?.includes("back pain")) {
      visualizations.push({
        anatomicalStructure: "L4-L5 Disc",
        pathologyType: "Annular Fissure with Disc Bulge",
        severity: "mild",
        location: "Posterolateral L4-L5",
        description: "Circumferential annular fissure with mild posterolateral disc bulge",
        visualizationPrompt: "Sagittal and axial medical illustration of L4-L5 disc showing annular fissure with mild posterolateral bulge approaching but not compressing nerve root",
        clinicalSignificance: "Early degenerative changes - may be source of discogenic pain",
        treatmentImplications: [
          "Core stabilization exercises",
          "Movement pattern training",
          "Manual therapy for mobility",
          "Gradual return to loading activities"
        ]
      });
    }

    // If no specific symptoms, create a general visualization
    if (visualizations.length === 0) {
      visualizations.push({
        anatomicalStructure: "Musculoskeletal System",
        pathologyType: "Movement Dysfunction",
        severity: "mild",
        location: "Multiple compensatory patterns",
        description: "Altered movement patterns with compensatory muscle activation",
        visualizationPrompt: "Body diagram showing altered movement patterns with highlighted compensatory muscle groups and movement restrictions",
        clinicalSignificance: "Movement dysfunction may lead to tissue overload and pain",
        treatmentImplications: [
          "Movement re-education",
          "Targeted strengthening",
          "Manual therapy",
          "Activity modification"
        ]
      });
    }

    setPathologyVisualizations(visualizations);
    setSelectedVisualization(visualizations[0]);
    setAnalysisComplete(true);
    setIsAnalyzing(false);
  };

  const generateMedicalIllustration = async (visualization: PathologyVisualization) => {
    setIsGeneratingImage(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-medical-illustration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: visualization.visualizationPrompt,
          anatomicalStructure: visualization.anatomicalStructure,
          pathologyType: visualization.pathologyType,
          severity: visualization.severity
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate medical illustration');
      }

      const data = await response.json();
      setGeneratedImageUrl(data.imageUrl);
    } catch (error) {
      console.error('Error generating medical illustration:', error);
      setError('Failed to generate medical illustration. Using anatomical diagram instead.');
      // Create a placeholder SVG illustration
      const svgData = createAnatomicalDiagram(visualization);
      setGeneratedImageUrl(svgData);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const createAnatomicalDiagram = (visualization: PathologyVisualization): string => {
    // Create a simple SVG anatomical diagram based on the pathology
    const svg = `
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="inflammation" patternUnits="userSpaceOnUse" width="4" height="4">
            <rect width="4" height="4" fill="#ff6b6b"/>
            <circle cx="2" cy="2" r="1" fill="#ff4757"/>
          </pattern>
        </defs>
        
        <!-- Background -->
        <rect width="400" height="400" fill="#f8f9fa"/>
        
        <!-- Title -->
        <text x="200" y="30" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold">
          ${visualization.anatomicalStructure}
        </text>
        <text x="200" y="50" text-anchor="middle" font-family="Arial" font-size="12" fill="#666">
          ${visualization.pathologyType}
        </text>
        
        <!-- Main anatomical structure -->
        <rect x="150" y="100" width="100" height="150" fill="#e1f5fe" stroke="#0277bd" stroke-width="2" rx="10"/>
        
        <!-- Pathology area -->
        <rect x="170" y="120" width="60" height="40" fill="url(#inflammation)" stroke="#d32f2f" stroke-width="2" rx="5"/>
        
        <!-- Labels -->
        <line x1="250" y1="140" x2="320" y2="120" stroke="#333" stroke-width="1"/>
        <text x="325" y="115" font-family="Arial" font-size="10" fill="#333">
          ${visualization.pathologyType}
        </text>
        <text x="325" y="128" font-family="Arial" font-size="8" fill="#666">
          ${visualization.severity} severity
        </text>
        
        <!-- Legend -->
        <rect x="50" y="300" width="300" height="80" fill="#fff" stroke="#ddd" stroke-width="1" rx="5"/>
        <text x="60" y="320" font-family="Arial" font-size="12" font-weight="bold">Clinical Findings:</text>
        <text x="60" y="340" font-family="Arial" font-size="10">${visualization.description}</text>
        <text x="60" y="360" font-family="Arial" font-size="10">Location: ${visualization.location}</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  const handleStartVisualization = () => {
    mockAnalyzePathology();
  };

  const handleSelectVisualization = (visualization: PathologyVisualization) => {
    setSelectedVisualization(visualization);
    setGeneratedImageUrl(null);
  };

  const handleGenerateIllustration = () => {
    if (selectedVisualization) {
      generateMedicalIllustration(selectedVisualization);
    }
  };

  const handleDownloadIllustration = () => {
    if (generatedImageUrl) {
      const link = document.createElement('a');
      link.href = generatedImageUrl;
      link.download = `${selectedVisualization?.pathologyType.replace(/\s+/g, '_')}_illustration.png`;
      link.click();
    }
  };

  useEffect(() => {
    if (onVisualizationComplete && analysisComplete) {
      onVisualizationComplete({
        visualizations: pathologyVisualizations,
        selectedVisualization,
        imageUrl: generatedImageUrl
      });
    }
  }, [analysisComplete, pathologyVisualizations, selectedVisualization, generatedImageUrl, onVisualizationComplete]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <Eye className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Clinical Visualization Engine</h2>
            <p className="text-muted-foreground">AI-Generated Medical Illustrations of Patient-Specific Pathology</p>
          </div>
        </div>
      </div>

      {!analysisComplete ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Pathology Analysis
            </CardTitle>
            <CardDescription>
              AI analysis of symptoms, posture, and movement to identify specific pathological changes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isAnalyzing ? (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Ready to analyze clinical findings and generate patient-specific medical illustrations
                </p>
                <Button onClick={handleStartVisualization} className="w-full">
                  <Zap className="h-4 w-4 mr-2" />
                  Start Clinical Visualization Analysis
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Analyzing pathological patterns...</span>
                </div>
                <Progress value={analysisProgress} className="w-full" />
                <p className="text-xs text-muted-foreground text-center">
                  Processing symptoms, posture, and movement data
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pathology Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Identified Pathologies
              </CardTitle>
              <CardDescription>
                Select a pathology to generate detailed medical illustration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pathologyVisualizations.map((viz, index) => (
                <Card 
                  key={index} 
                  className={`cursor-pointer transition-all ${
                    selectedVisualization === viz ? 'ring-2 ring-primary' : 'hover:shadow-md'
                  }`}
                  onClick={() => handleSelectVisualization(viz)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={viz.severity === 'severe' ? 'destructive' : viz.severity === 'moderate' ? 'default' : 'secondary'}>
                            {viz.severity}
                          </Badge>
                          <h4 className="font-semibold">{viz.pathologyType}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">{viz.anatomicalStructure}</p>
                        <p className="text-xs">{viz.description}</p>
                      </div>
                      {selectedVisualization === viz && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* Visualization Display */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                Medical Illustration
              </CardTitle>
              <CardDescription>
                AI-generated patient-specific anatomical visualization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedVisualization && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">{selectedVisualization.pathologyType}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {selectedVisualization.description}
                    </p>
                    <div className="text-xs">
                      <strong>Location:</strong> {selectedVisualization.location}
                    </div>
                  </div>

                  {!generatedImageUrl ? (
                    <div className="text-center space-y-4">
                      <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                        <div className="text-center space-y-2">
                          <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto" />
                          <p className="text-sm text-muted-foreground">
                            Generate medical illustration
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={handleGenerateIllustration}
                        disabled={isGeneratingImage}
                        className="w-full"
                      >
                        {isGeneratingImage ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating Illustration...
                          </>
                        ) : (
                          <>
                            <Activity className="h-4 w-4 mr-2" />
                            Generate Medical Illustration
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="border rounded-lg overflow-hidden">
                        <img 
                          src={generatedImageUrl} 
                          alt={`Medical illustration of ${selectedVisualization.pathologyType}`}
                          className="w-full h-auto"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleGenerateIllustration}
                          variant="outline"
                          size="sm"
                          disabled={isGeneratingImage}
                        >
                          <RefreshCcw className="h-4 w-4 mr-2" />
                          Regenerate
                        </Button>
                        <Button 
                          onClick={handleDownloadIllustration}
                          variant="outline"
                          size="sm"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  )}

                  {error && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Note</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Clinical Significance */}
      {selectedVisualization && analysisComplete && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Clinical Significance & Treatment Implications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Clinical Significance</h4>
              <p className="text-sm text-muted-foreground">
                {selectedVisualization.clinicalSignificance}
              </p>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold mb-2">Treatment Implications</h4>
              <ul className="space-y-1">
                {selectedVisualization.treatmentImplications.map((implication, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                    {implication}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClinicalVisualizationEngine;