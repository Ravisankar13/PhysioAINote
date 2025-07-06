import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, Calendar, Activity, Heart, Brain, FileText, Users, Edit2, Check, X, Camera, Video, Search, BookOpen, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SoapVirtualPatient } from "@shared/schema";
import MotionCapture from "@/components/MotionCapture";

export default function VirtualPatientsPage() {
  // Get all virtual patients for user
  const { data: virtualPatients = [], isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/virtual-patients"],
  });

  if (patientsLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Virtual Patients</h1>
            <p className="text-gray-600">Loading your virtual patient profiles...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Virtual Patients</h1>
          <p className="text-gray-600">
            AI-generated patient profiles created from your SOAP notes for simulation and training
          </p>
        </div>

        {virtualPatients.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Virtual Patients Yet</h3>
              <p className="text-gray-500 mb-4">
                Create virtual patients from your completed SOAP notes to generate realistic patient profiles
              </p>
              <p className="text-sm text-gray-400">
                Go to SOAP Notes → AI Paperwork tab and click "Create Virtual Patient" for any completed session
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {virtualPatients.map((patient: SoapVirtualPatient) => (
              <VirtualPatientCard key={patient.id} patient={patient} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VirtualPatientCard({ patient }: { patient: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [showMotionCapture, setShowMotionCapture] = useState(false);
  const [capturedMotionData, setCapturedMotionData] = useState<any>(null);
  const [isAddingMotionData, setIsAddingMotionData] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [aiAnalysisData, setAiAnalysisData] = useState<any>(null);
  const [isLoadingAIAnalysis, setIsLoadingAIAnalysis] = useState(false);
  const [showResearchDialog, setShowResearchDialog] = useState(false);
  const [relevantResearch, setRelevantResearch] = useState<any[]>([]);
  const [isLoadingResearch, setIsLoadingResearch] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Add null checks to prevent undefined errors
  if (!patient) return null;
  
  // Handle both original virtual patients and SOAP virtual patients
  const isOriginalPatient = patient.type === 'original';
  
  const profile = isOriginalPatient ? {
    name: patient.patient_name,
    age: patient.age,
    gender: patient.gender
  } : (patient.patientProfile || {});
  
  const presentation = isOriginalPatient ? {
    chiefComplaint: patient.chief_complaint
  } : (patient.clinicalPresentation || {});
  
  const findings = isOriginalPatient ? {
    inspection: patient.symptoms_description
  } : (patient.physicalFindings || {});
  
  const communication = isOriginalPatient ? {} : (patient.communicationStyle || {});

  // Rename mutation
  const renameMutation = useMutation({
    mutationFn: async (newName: string) => {
      const response = await apiRequest(
        'PATCH',
        `/api/virtual-patients/${patient.id}/rename`,
        { newName }
      );
      return await response.json();
    },
    onSuccess: () => {
      setIsEditing(false);
      setEditName('');
      queryClient.invalidateQueries({ queryKey: ["/api/virtual-patients"] });
      toast({
        title: "Success",
        description: "Virtual patient renamed successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to rename virtual patient",
        variant: "destructive"
      });
    }
  });

  // Add motion capture data mutation
  const addMotionDataMutation = useMutation({
    mutationFn: async (motionData: any) => {
      const response = await apiRequest(
        'POST',
        `/api/virtual-patients/${patient.id}/motion-data`,
        { motionData }
      );
      return await response.json();
    },
    onSuccess: () => {
      setShowMotionCapture(false);
      setCapturedMotionData(null);
      queryClient.invalidateQueries({ queryKey: ["/api/virtual-patients"] });
      toast({
        title: "Digital Twin Enhanced",
        description: "Motion capture data has been added to create a comprehensive digital patient twin!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add motion capture data",
        variant: "destructive"
      });
    }
  });

  // AI Analysis function
  const performAIAnalysis = async () => {
    setIsLoadingAIAnalysis(true);
    try {
      const response = await apiRequest(
        'POST',
        `/api/virtual-patients/${patient.id}/ai-analysis`,
        {}
      );
      const analysisData = await response.json();
      setAiAnalysisData(analysisData);
      setShowAIAnalysis(true);
    } catch (error: any) {
      toast({
        title: "Analysis Error",
        description: error.message || "Failed to generate AI analysis",
        variant: "destructive"
      });
    } finally {
      setIsLoadingAIAnalysis(false);
    }
  };

  // Find Relevant Research function
  const findRelevantResearch = async () => {
    setIsLoadingResearch(true);
    try {
      const response = await apiRequest(
        'POST',
        `/api/virtual-patients/${patient.id}/relevant-research`,
        {}
      );
      const researchData = await response.json();
      setRelevantResearch(researchData || []);
      setShowResearchDialog(true);
    } catch (error: any) {
      toast({
        title: "Research Error",
        description: error.message || "Failed to find relevant research",
        variant: "destructive"
      });
    } finally {
      setIsLoadingResearch(false);
    }
  };

  const handleStartEdit = () => {
    setEditName(profile.name || patient.patient_name || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editName.trim() && editName.trim() !== (profile.name || patient.patient_name)) {
      renameMutation.mutate(editName.trim());
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditName('');
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <User className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1"
                placeholder="Enter patient name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') handleCancel();
                }}
              />
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={renameMutation.isPending}
                  className="h-8 w-8 p-0"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={renameMutation.isPending}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <span className="flex-1">{profile.name || patient.patient_name || 'Unknown Patient'}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleStartEdit}
                className="h-8 w-8 p-0 opacity-50 hover:opacity-100"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </CardTitle>
          )}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {patient.body_part || patient.bodyPart || 'general'}
            </Badge>
            <Badge variant="secondary">
              {patient.type === 'original' ? 'Original' : 'SOAP-Generated'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {profile.age || 'N/A'} years old
          </span>
          <span>{profile.gender || 'N/A'}</span>
          <span className="text-blue-600 font-medium">
            Created: {new Date(patient.created_at).toLocaleDateString()}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Chief Complaint */}
        <div>
          <h4 className="font-medium text-sm text-gray-800 mb-1 flex items-center gap-1">
            <Heart className="h-3 w-3 text-red-500" />
            Chief Complaint
          </h4>
          <p className="text-sm text-gray-700 bg-red-50 p-2 rounded">
            {presentation.chiefComplaint || 'No chief complaint documented'}
          </p>
        </div>

        {/* Diagnosis */}
        <div>
          <h4 className="font-medium text-sm text-gray-800 mb-1 flex items-center gap-1">
            <Activity className="h-3 w-3 text-blue-500" />
            Diagnosis
          </h4>
          <p className="text-sm text-gray-700 bg-blue-50 p-2 rounded">
            {isOriginalPatient ? patient.diagnosis : (patient.assessmentPlan?.primaryDiagnosis || 'No diagnosis documented')}
          </p>
        </div>

        <Separator />

        {/* Physical Findings Summary */}
        <div>
          <h4 className="font-medium text-sm text-gray-800 mb-2 flex items-center gap-1">
            <Activity className="h-3 w-3 text-green-500" />
            Key Physical Findings
          </h4>
          <div className="space-y-1 text-sm">
            {findings.inspection && (
              <p className="text-gray-700">
                <span className="font-medium">Inspection:</span> {findings.inspection}
              </p>
            )}
            {findings.palpation && (
              <p className="text-gray-700">
                <span className="font-medium">Palpation:</span> {findings.palpation}
              </p>
            )}
            {findings.specialTests && findings.specialTests.length > 0 && (
              <div>
                <span className="font-medium text-gray-700">Special Tests:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {findings.specialTests.map((test, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {test}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Communication Style */}
        <div>
          <h4 className="font-medium text-sm text-gray-800 mb-1 flex items-center gap-1">
            <Brain className="h-3 w-3 text-purple-500" />
            Communication Style
          </h4>
          <p className="text-sm text-gray-700 bg-purple-50 p-2 rounded">
            {communication.personality || 'No communication style documented'}
          </p>
        </div>

        {/* Functional Limitations */}
        {presentation.functionalLimitations && Array.isArray(presentation.functionalLimitations) && presentation.functionalLimitations.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-gray-800 mb-1">Functional Limitations</h4>
            <div className="flex flex-wrap gap-1">
              {presentation.functionalLimitations.map((limitation, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {limitation}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Patient Concerns */}
        {communication.concerns && communication.concerns.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-gray-800 mb-1">Patient Concerns</h4>
            <div className="flex flex-wrap gap-1">
              {communication.concerns.map((concern, index) => (
                <Badge key={index} variant="outline" className="text-xs text-orange-600 border-orange-300">
                  {concern}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Motion Capture Section */}
        <div className="pt-2 border-t">
          {patient.motionData ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Video className="h-4 w-4" />
                <span className="font-medium">Digital Twin Complete</span>
              </div>
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                Motion Data ✓
              </Badge>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Camera className="h-4 w-4" />
                  <span>Enhance with Motion Capture</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowMotionCapture(true)}
                  className="text-xs"
                >
                  <Video className="h-3 w-3 mr-1" />
                  Add Motion Data
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Add real movement patterns to create a comprehensive digital patient twin
              </p>
            </div>
          )}
        </div>

        {/* Clinical Analysis Tools */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm text-gray-800 flex items-center gap-1">
              <Brain className="h-3 w-3 text-blue-500" />
              Clinical Analysis
            </h4>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={performAIAnalysis}
              disabled={isLoadingAIAnalysis}
              className="text-xs flex-1"
            >
              {isLoadingAIAnalysis ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Brain className="h-3 w-3 mr-1" />
              )}
              AI Analysis
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={findRelevantResearch}
              disabled={isLoadingResearch}
              className="text-xs flex-1"
            >
              {isLoadingResearch ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <BookOpen className="h-3 w-3 mr-1" />
              )}
              Find Research
            </Button>
          </div>
        </div>

        {/* Metadata */}
        <div className="pt-2 border-t text-xs text-gray-500 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            SOAP Note #{patient.soapNoteId}
          </span>
          <span>Est. Duration: {patient.estimatedDuration}</span>
        </div>
      </CardContent>

      {/* Motion Capture Dialog */}
      <Dialog open={showMotionCapture} onOpenChange={setShowMotionCapture}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-blue-600" />
              Enhance Virtual Patient: {profile.name || patient.patient_name}
            </DialogTitle>
            <p className="text-sm text-gray-600">
              Capture movement patterns to create a comprehensive digital patient twin combining clinical data with real biomechanics
            </p>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <MotionCapture
              onComplete={(motionData) => {
                setCapturedMotionData(motionData);
                addMotionDataMutation.mutate(motionData);
              }}
              onError={(error) => {
                toast({
                  title: "Motion Capture Error",
                  description: error,
                  variant: "destructive",
                });
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Analysis Dialog */}
      <Dialog open={showAIAnalysis} onOpenChange={setShowAIAnalysis}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              AI Clinical Analysis: {profile.name || patient.patient_name}
            </DialogTitle>
            <p className="text-sm text-gray-600">
              Comprehensive AI analysis of this virtual patient case
            </p>
          </DialogHeader>
          
          {aiAnalysisData && (
            <div className="space-y-6">
              {/* Clinical Summary */}
              {aiAnalysisData.clinicalSummary && (
                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    Clinical Summary
                  </h3>
                  <p className="text-gray-700 leading-relaxed">{aiAnalysisData.clinicalSummary}</p>
                </div>
              )}

              {/* Diagnostic Analysis */}
              {aiAnalysisData.diagnosticAnalysis && (
                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Search className="h-4 w-4 text-green-500" />
                    Diagnostic Analysis
                  </h3>
                  <p className="text-gray-700 leading-relaxed">{aiAnalysisData.diagnosticAnalysis}</p>
                </div>
              )}

              {/* Treatment Recommendations */}
              {aiAnalysisData.treatmentRecommendations && (
                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    Treatment Recommendations
                  </h3>
                  <p className="text-gray-700 leading-relaxed">{aiAnalysisData.treatmentRecommendations}</p>
                </div>
              )}

              {/* Key Insights */}
              {aiAnalysisData.keyInsights && Array.isArray(aiAnalysisData.keyInsights) && (
                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-500" />
                    Key Clinical Insights
                  </h3>
                  <div className="space-y-2">
                    {aiAnalysisData.keyInsights.map((insight: string, index: number) => (
                      <div key={index} className="bg-purple-50 p-3 rounded-lg border-l-4 border-purple-200">
                        <p className="text-gray-700">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence Score */}
              {aiAnalysisData.confidenceScore && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Analysis Confidence</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${aiAnalysisData.confidenceScore}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{aiAnalysisData.confidenceScore}%</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Research Dialog */}
      <Dialog open={showResearchDialog} onOpenChange={setShowResearchDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-green-600" />
              Relevant Research: {profile.name || patient.patient_name}
            </DialogTitle>
            <p className="text-sm text-gray-600">
              Research articles and evidence relevant to this case
            </p>
          </DialogHeader>
          
          {relevantResearch && relevantResearch.length > 0 ? (
            <div className="space-y-4">
              {relevantResearch.map((article: any, index: number) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                  <h3 className="font-semibold text-lg mb-2 text-blue-700">
                    {article.title || 'Research Article'}
                  </h3>
                  
                  <div className="flex flex-wrap gap-2 mb-2">
                    {article.authors && (
                      <Badge variant="outline" className="text-xs">
                        {article.authors}
                      </Badge>
                    )}
                    {article.journal && (
                      <Badge variant="secondary" className="text-xs">
                        {article.journal}
                      </Badge>
                    )}
                    {article.bodyPart && (
                      <Badge variant="default" className="text-xs">
                        {article.bodyPart}
                      </Badge>
                    )}
                  </div>
                  
                  {article.abstract && (
                    <p className="text-gray-700 text-sm mb-3 leading-relaxed">
                      {article.abstract}
                    </p>
                  )}
                  
                  {article.relevanceScore && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-600">Relevance:</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-1">
                        <div 
                          className="bg-green-500 h-1 rounded-full" 
                          style={{ width: `${article.relevanceScore}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium">{article.relevanceScore}%</span>
                    </div>
                  )}
                  
                  {article.url && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.open(article.url, '_blank')}
                      className="text-xs"
                    >
                      <BookOpen className="h-3 w-3 mr-1" />
                      View Article
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No relevant research found for this case.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}