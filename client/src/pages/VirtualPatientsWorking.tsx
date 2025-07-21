import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Users, Camera, Activity, Play, Pause, RotateCcw, FileUser, Edit2, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import type { SoapVirtualPatient } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import Text3DAnimation from "@/components/Text3DAnimation";

export default function VirtualPatientsWorking() {
  const [selectedPatient, setSelectedPatient] = useState<SoapVirtualPatient | null>(null);
  const [editingPatientId, setEditingPatientId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isLoadingAnimation, setIsLoadingAnimation] = useState(false);
  const [customText, setCustomText] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    profile: true,
    animation: true,
    textInput: false
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all virtual patients for user
  const { data: virtualPatients = [], isLoading: patientsLoading, error } = useQuery({
    queryKey: ["/api/virtual-patients"],
  });

  const patientsArray = Array.isArray(virtualPatients) ? virtualPatients : [];

  // Update patient mutation
  const updatePatientMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const response = await apiRequest('PATCH', `/api/virtual-patients/${id}`, { title: name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/virtual-patients"] });
      setEditingPatientId(null);
      setEditingName('');
      toast({
        title: "Patient Updated",
        description: "Patient name has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update patient name",
        variant: "destructive"
      });
    }
  });

  // Handle patient selection
  const handlePatientSelect = (patient: SoapVirtualPatient) => {
    try {
      setSelectedPatient(patient);
      toast({
        title: "Patient Selected",
        description: `Selected ${patient.title || `Patient ${patient.id}`}`,
      });
    } catch (error) {
      console.error('Error selecting patient:', error);
      toast({
        title: "Selection Error",
        description: "Unable to select patient. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Helper functions for editing patient names
  const startEditing = (patient: SoapVirtualPatient) => {
    setEditingPatientId(patient.id!);
    setEditingName(patient.title || `Patient ${patient.id}`);
  };

  const cancelEditing = () => {
    setEditingPatientId(null);
    setEditingName('');
  };

  const savePatientName = () => {
    if (editingPatientId && editingName.trim()) {
      updatePatientMutation.mutate({ id: editingPatientId, name: editingName.trim() });
    }
  };

  // Text-to-animation function
  const generateAnimationFromText = async (clinicalText: string) => {
    if (!clinicalText.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter clinical description to generate animation",
        variant: "destructive"
      });
      return;
    }

    setIsLoadingAnimation(true);
    try {
      // Simulate animation generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Animation Generated",
        description: "Created movement visualization from clinical description",
      });
    } catch (error: any) {
      toast({
        title: "Animation Error",
        description: error.message || "Failed to generate animation",
        variant: "destructive"
      });
    } finally {
      setIsLoadingAnimation(false);
    }
  };

  // Playback controls
  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const resetPlayback = () => {
    setPlaybackTime(0);
    setIsPlaying(false);
  };

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (patientsLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading virtual patients...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-red-600">Error loading patients: {String(error)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-600" />
                Virtual Patients
              </h1>
              <p className="text-gray-600 mt-2">
                Create and analyze digital patient twins with AI-powered movement visualization
              </p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Camera className="h-4 w-4 mr-2" />
              Motion Capture
            </Button>
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Patient Selection */}
          <div className="lg:col-span-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <FileUser className="h-5 w-5 text-blue-600" />
                  Patient Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-96 px-4">
                  <div className="space-y-3 py-4">
                    {patientsArray.length > 0 ? (
                      patientsArray.map((patient: SoapVirtualPatient) => (
                        <Card 
                          key={patient.id} 
                          className={`cursor-pointer transition-all hover:shadow-md group ${
                            selectedPatient?.id === patient.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handlePatientSelect(patient);
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              {editingPatientId === patient.id ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') savePatientName();
                                      if (e.key === 'Escape') cancelEditing();
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    onClick={savePatientName}
                                    disabled={updatePatientMutation.isPending}
                                  >
                                    {updatePatientMutation.isPending ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Check className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={cancelEditing}
                                    disabled={updatePatientMutation.isPending}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 flex-1">
                                  <div>
                                    <h3 className="font-medium text-gray-900">
                                      {patient.title || `Patient ${patient.id}`}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                      Body Part: {patient.bodyPart || 'Not specified'}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditing(patient);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            {patient.motionData ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 mt-2">
                                Digital Twin
                              </Badge>
                            ) : null}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <FileUser className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-sm">No virtual patients available</p>
                        <p className="text-xs text-gray-400">Use Motion Capture to create your first patient</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Center Panel - Animation Visualization */}
          <div className="lg:col-span-4">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  Movement Visualization
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {isLoadingAnimation ? (
                  <div className="text-center text-gray-500 py-12">
                    <Loader2 className="h-16 w-16 mx-auto mb-4 text-blue-400 animate-spin" />
                    <p className="text-lg font-semibold">Generating Animation</p>
                    <p className="text-sm">Processing clinical movement patterns...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 3D Animation Display Area */}
                    {customText.trim() || selectedPatient ? (
                      <Text3DAnimation
                        clinicalText={customText.trim() || selectedPatient?.title || ''}
                        isPlaying={isPlaying}
                        onTimeUpdate={(time) => setPlaybackTime(time)}
                      />
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-6 text-center min-h-[300px] flex items-center justify-center">
                        <div className="text-gray-400 space-y-2">
                          <div className="text-4xl">🎬</div>
                          <p>Enter clinical description or select patient</p>
                          <p className="text-sm">to generate 3D movement visualization</p>
                        </div>
                      </div>
                    )}

                    {/* Playback Controls */}
                    {selectedPatient && (
                      <div className="flex items-center justify-center gap-4">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={togglePlayback}
                        >
                          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={resetPlayback}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <div className="text-sm text-gray-500">
                          {playbackTime.toFixed(1)}s
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Patient Details & Controls */}
          <div className="lg:col-span-4">
            <div className="space-y-4">
              {/* Patient Profile */}
              <Collapsible 
                open={expandedSections.profile} 
                onOpenChange={() => toggleSection('profile')}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                      <CardTitle className="text-lg font-semibold flex items-center justify-between">
                        Patient Profile
                        {expandedSections.profile ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      {selectedPatient ? (
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium text-gray-700">Patient ID</p>
                            <p className="text-gray-900">{selectedPatient.id}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Name</p>
                            <p className="text-gray-900">{selectedPatient.title || 'Unnamed Patient'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Body Part</p>
                            <p className="text-gray-900">{selectedPatient.bodyPart || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Motion Data</p>
                            <Badge variant={selectedPatient.motionData ? "default" : "secondary"}>
                              {selectedPatient.motionData ? "Available" : "Not Available"}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500">Select a patient to view profile</p>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Text to Animation */}
              <Collapsible 
                open={expandedSections.textInput} 
                onOpenChange={() => toggleSection('textInput')}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                      <CardTitle className="text-lg font-semibold flex items-center justify-between">
                        Text to Animation
                        {expandedSections.textInput ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      <Textarea
                        placeholder="Describe movement limitations (e.g., 'limited shoulder movement', 'back stiffness', 'knee limping')..."
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        rows={4}
                      />
                      <div className="text-xs text-gray-500 space-y-1">
                        <p><strong>Try these examples:</strong></p>
                        <p>• "Limited shoulder elevation with pain"</p>
                        <p>• "Back stiffness with restricted flexion"</p>
                        <p>• "Knee pain with compensated gait"</p>
                        <p>• "Hip restriction with limited range"</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => generateAnimationFromText(customText)}
                          disabled={isLoadingAnimation || !customText.trim()}
                          className="flex-1"
                        >
                          {isLoadingAnimation ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            'Generate 3D Animation'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setCustomText('')}
                          disabled={!customText.trim()}
                        >
                          Clear
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    disabled={!selectedPatient}
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Generate AI Analysis
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    disabled={!selectedPatient}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Record New Motion
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Debug Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-medium">Patients Loaded</p>
                <p className="text-gray-600">{patientsArray.length}</p>
              </div>
              <div>
                <p className="font-medium">Selected Patient</p>
                <p className="text-gray-600">{selectedPatient ? selectedPatient.title || `Patient ${selectedPatient.id}` : 'None'}</p>
              </div>
              <div>
                <p className="font-medium">Animation Status</p>
                <p className="text-gray-600">{isLoadingAnimation ? 'Generating' : 'Ready'}</p>
              </div>
              <div>
                <p className="font-medium">Motion Data</p>
                <p className="text-gray-600">{selectedPatient?.motionData ? 'Available' : 'None'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}