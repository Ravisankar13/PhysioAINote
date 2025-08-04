import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Users, Camera, Activity, Stethoscope, Dumbbell, Plus, Save, Trash2, Edit, X, Check, Settings, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import Text3DAnimation from "@/components/Text3DAnimation";
import type { SoapVirtualPatient, VirtualPatientConfig, InsertVirtualPatientConfig } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";

export default function VirtualPatientsManagement() {
  const [selectedPatient, setSelectedPatient] = useState<SoapVirtualPatient | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<VirtualPatientConfig | null>(null);
  const [selectedTest, setSelectedTest] = useState<string>("");
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [animationSpeed, setAnimationSpeed] = useState<number[]>([1]);
  const [repetitions, setRepetitions] = useState<number[]>([10]);
  const [selectedSide, setSelectedSide] = useState<'both' | 'left' | 'right'>('both');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Limb scale states
  const [upperArmScale, setUpperArmScale] = useState<number[]>([1.0]);
  const [forearmScale, setForearmScale] = useState<number[]>([1.0]);
  const [thighScale, setThighScale] = useState<number[]>([1.0]);
  const [shinScale, setShinScale] = useState<number[]>([1.0]);
  const [torsoScale, setTorsoScale] = useState<number[]>([1.0]);
  const [overallScale, setOverallScale] = useState<number[]>([1.0]);
  
  // Hip pathology states
  const [hipNeckAngle, setHipNeckAngle] = useState<number[]>([130]);
  const [hipAnteversion, setHipAnteversion] = useState<number[]>([12]);
  const [acetabularCoverage, setAcetabularCoverage] = useState<number[]>([75]);
  
  // Knee pathology states
  const [kneeVarusValgus, setKneeVarusValgus] = useState<number[]>([3]);
  const [patellaHeight, setPatellaHeight] = useState<number[]>([1.0]);
  const [tibialTorsion, setTibialTorsion] = useState<number[]>([10]);
  
  // Shoulder pathology states
  const [scapularWinging, setScapularWinging] = useState<number[]>([3]);
  const [acSeparation, setAcSeparation] = useState<number[]>([0]);
  const [ghSubluxation, setGhSubluxation] = useState<number[]>([0]);
  
  // Ankle pathology states
  const [subtalarStiffness, setSubtalarStiffness] = useState<number[]>([0]);
  const [ankleInstability, setAnkleInstability] = useState<'none' | 'lateral' | 'medial' | 'combined'>('none');
  const [hindfootAngle, setHindfootAngle] = useState<number[]>([0]);
  const [ankleEffusion, setAnkleEffusion] = useState<number[]>([0]);
  
  // Anthropometric states
  const [height, setHeight] = useState<number[]>([170]);
  const [weight, setWeight] = useState<number[]>([70]);
  const [bodyType, setBodyType] = useState<'ectomorph' | 'mesomorph' | 'endomorph'>('mesomorph');
  
  // Postural deviation states
  const [forwardHead, setForwardHead] = useState<number[]>([0]);
  const [thoracicKyphosis, setThoracicKyphosis] = useState<number[]>([35]);
  const [lumbarLordosis, setLumbarLordosis] = useState<number[]>([-50]);
  const [pelvicTilt, setPelvicTilt] = useState<number[]>([8]);
  const [shoulderHeight, setShoulderHeight] = useState<number[]>([0]);
  const [scoliosis, setScoliosis] = useState<number[]>([0]);
  
  // Movement quality states
  const [movementSpeed, setMovementSpeed] = useState<'very_slow' | 'slow' | 'normal' | 'fast'>('normal');
  const [balanceQuality, setBalanceQuality] = useState<'poor' | 'fair' | 'good' | 'excellent'>('good');
  const [coordination, setCoordination] = useState<'smooth' | 'mildly_jerky' | 'moderately_jerky' | 'severely_jerky'>('smooth');
  const [hipHike, setHipHike] = useState<boolean>(false);
  const [trunkLean, setTrunkLean] = useState<boolean>(false);
  const [circumduction, setCircumduction] = useState<boolean>(false);
  const [trendelenburg, setTrendelenburg] = useState<boolean>(false);

  // Get all SOAP virtual patients for user
  const { data: virtualPatients = [], isLoading: patientsLoading, error: patientsError } = useQuery({
    queryKey: ["/api/soap-virtual-patients"],
  });

  // Get all virtual patient configs for user
  const { data: virtualPatientConfigs = [], isLoading: configsLoading, error: configsError } = useQuery({
    queryKey: ["/api/virtual-patient-configs"],
  });

  const patientsArray = Array.isArray(virtualPatients) ? virtualPatients : [];
  const configsArray = Array.isArray(virtualPatientConfigs) ? virtualPatientConfigs : [];

  // Mutations for virtual patient configs
  const createConfigMutation = useMutation({
    mutationFn: async (data: InsertVirtualPatientConfig) => {
      return await apiRequest("/api/virtual-patient-configs", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/virtual-patient-configs"] });
      toast({
        title: "Success",
        description: "Virtual patient configuration created successfully",
      });
      setIsCreatingNew(false);
      setEditingName("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create configuration",
        variant: "destructive",
      });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<VirtualPatientConfig> }) => {
      return await apiRequest(`/api/virtual-patient-configs/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/virtual-patient-configs"] });
      toast({
        title: "Success",
        description: "Virtual patient configuration saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update configuration",
        variant: "destructive",
      });
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/virtual-patient-configs/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/virtual-patient-configs"] });
      toast({
        title: "Success",
        description: "Virtual patient configuration deleted successfully",
      });
      setSelectedConfig(null);
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete configuration",
        variant: "destructive",
      });
    },
  });

  // Helper function to collect current configuration
  const collectCurrentConfig = () => {
    return {
      skeletonConfig: {
        limbs: {
          upperArm: upperArmScale[0],
          forearm: forearmScale[0],
          thigh: thighScale[0],
          shin: shinScale[0],
          torso: torsoScale[0],
          overall: overallScale[0]
        },
        anthropometrics: {
          height: height[0],
          weight: weight[0],
          bodyType: bodyType
        },
        posture: {
          forwardHead: forwardHead[0],
          thoracicKyphosis: thoracicKyphosis[0],
          lumbarLordosis: lumbarLordosis[0],
          pelvicTilt: pelvicTilt[0],
          shoulderHeight: shoulderHeight[0],
          scoliosis: scoliosis[0]
        },
        movementQuality: {
          speed: movementSpeed,
          balance: balanceQuality,
          coordination: coordination,
          compensations: {
            hipHike,
            trunkLean,
            circumduction,
            trendelenburg
          }
        }
      },
      pathologies: [
        ...(hipNeckAngle[0] !== 130 || hipAnteversion[0] !== 12 || acetabularCoverage[0] !== 75 ? [{
          type: 'hip' as const,
          parameters: {
            neckAngle: hipNeckAngle[0],
            anteversion: hipAnteversion[0],
            acetabularCoverage: acetabularCoverage[0]
          }
        }] : []),
        ...(kneeVarusValgus[0] !== 3 || patellaHeight[0] !== 1.0 || tibialTorsion[0] !== 10 ? [{
          type: 'knee' as const,
          parameters: {
            varusValgus: kneeVarusValgus[0],
            patellaHeight: patellaHeight[0],
            tibialTorsion: tibialTorsion[0]
          }
        }] : []),
        ...(scapularWinging[0] !== 3 || acSeparation[0] !== 0 || ghSubluxation[0] !== 0 ? [{
          type: 'shoulder' as const,
          parameters: {
            scapularWinging: scapularWinging[0],
            acSeparation: acSeparation[0],
            ghSubluxation: ghSubluxation[0]
          }
        }] : []),
        ...(subtalarStiffness[0] !== 0 || ankleInstability !== 'none' || hindfootAngle[0] !== 0 || ankleEffusion[0] !== 0 ? [{
          type: 'ankle' as const,
          parameters: {
            subtalarStiffness: subtalarStiffness[0],
            instability: ankleInstability,
            hindfootAngle: hindfootAngle[0],
            effusion: ankleEffusion[0]
          }
        }] : [])
      ]
    };
  };

  // Helper function to load configuration
  const loadConfiguration = (config: VirtualPatientConfig) => {
    const modelConfig = config.modelConfig || {};
    const pathologies: any[] = [];
    
    // Load limb scales
    if (modelConfig.limbScales) {
      setUpperArmScale([modelConfig.limbScales.upperArm || 1.0]);
      setForearmScale([modelConfig.limbScales.forearm || 1.0]);
      setThighScale([modelConfig.limbScales.thigh || 1.0]);
      setShinScale([modelConfig.limbScales.shin || 1.0]);
      setOverallScale([modelConfig.limbScales.overall || 1.0]);
    }
    
    // Load spinal pathologies
    if (modelConfig.spinalPathology) {
      setScoliosis([modelConfig.spinalPathology.scoliosis || 0]);
      setThoracicKyphosis([modelConfig.spinalPathology.kyphosis || 45]);
      setLumbarLordosis([modelConfig.spinalPathology.lordosis || 45]);
    }
    
    // Load shoulder pathologies
    if (modelConfig.shoulderPathology) {
      setScapularWinging([modelConfig.shoulderPathology.scapularWinging || 0]);
      setAcSeparation([modelConfig.shoulderPathology.acSeparation || 0]);
      setGhSubluxation([modelConfig.shoulderPathology.ghSubluxation || 0]);
    }
    
    // Load lower limb pathologies  
    if (modelConfig.lowerLimbPathology) {
      setGenuVarum([modelConfig.lowerLimbPathology.genuVarum || 0]);
      setGenuValgum([modelConfig.lowerLimbPathology.genuValgum || 0]);
      setPatellaHeight([modelConfig.lowerLimbPathology.patellaHeight || 1]);
    }
    

  };

  // Auto-save configuration when sliders change
  useEffect(() => {
    if (!selectedConfig) return;
    
    const timeoutId = setTimeout(() => {
      const modelConfig = {
        limbScales: {
          overall: overallScale[0],
          upperArm: upperArmScale[0],
          forearm: forearmScale[0],
          thigh: thighScale[0],
          shin: shinScale[0]
        },
        shoulderPathology: {
          scapularWinging: scapularWinging[0],
          acSeparation: acSeparation[0],
          ghSubluxation: ghSubluxation[0]
        },
        spinalPathology: {
          scoliosis: scoliosis[0],
          kyphosis: thoracicKyphosis[0],
          lordosis: lumbarLordosis[0]
        },
        lowerLimbPathology: {
          genuVarum: genuVarum[0],
          genuValgum: genuValgum[0],
          patellaHeight: patellaHeight[0]
        }
      };
      
      updateConfigMutation.mutate({
        id: selectedConfig.id,
        data: {
          modelConfig: modelConfig
        }
      });
    }, 1000); // Save after 1 second of no changes

    return () => clearTimeout(timeoutId);
  }, [
    upperArmScale, forearmScale, thighScale, shinScale, torsoScale, overallScale,
    height, weight, bodyType, forwardHead, thoracicKyphosis, lumbarLordosis,
    pelvicTilt, shoulderHeight, scoliosis, movementSpeed, balanceQuality,
    coordination, hipHike, trunkLean, circumduction, trendelenburg,
    hipNeckAngle, hipAnteversion, acetabularCoverage, kneeVarusValgus,
    patellaHeight, tibialTorsion, scapularWinging, acSeparation, ghSubluxation,
    subtalarStiffness, ankleInstability, hindfootAngle, ankleEffusion
  ]);

  // Handle create new configuration
  const handleCreateConfig = () => {
    if (!editingName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a patient name",
        variant: "destructive",
      });
      return;
    }
    
    const modelConfig = {
      limbScales: {
        overall: overallScale[0],
        upperArm: upperArmScale[0],
        forearm: forearmScale[0],
        thigh: thighScale[0],
        shin: shinScale[0]
      },
      shoulderPathology: {
        scapularWinging: scapularWinging[0],
        acSeparation: acSeparation[0],
        ghSubluxation: ghSubluxation[0]
      },
      spinalPathology: {
        scoliosis: scoliosis[0],
        kyphosis: thoracicKyphosis[0],
        lordosis: lumbarLordosis[0]
      },
      lowerLimbPathology: {
        genuVarum: genuVarum[0],
        genuValgum: genuValgum[0],
        patellaHeight: patellaHeight[0]
      }
    };
    
    createConfigMutation.mutate({
      patient_name: editingName.trim(),
      soapVirtualPatientId: selectedPatient?.id || null,
      modelConfig: modelConfig
    });
  };

  // Handle select configuration
  const handleSelectConfig = (config: VirtualPatientConfig) => {
    setSelectedConfig(config);
    loadConfiguration(config);
    setEditingName(config.patient_name);
  };

  // Assessment tests data
  const assessmentTests = [
    { id: 1, name: "Shoulder Abduction Test", text: "Shoulder abduction test - arms to sides then out", bodyPart: "shoulder" },
    { id: 2, name: "Shoulder Flexion Test", text: "Shoulder flexion test - arms forward then up", bodyPart: "shoulder" },
    { id: 3, name: "Shoulder External Rotation", text: "Shoulder external rotation test", bodyPart: "shoulder" },
    { id: 4, name: "Shoulder Internal Rotation", text: "Shoulder internal rotation test", bodyPart: "shoulder" },
    { id: 5, name: "Knee Flexion Test", text: "Knee flexion test assessment", bodyPart: "knee" },
    { id: 6, name: "Hip Abduction Test", text: "Hip abduction test - leg to side", bodyPart: "hip" },
    { id: 7, name: "Cervical Rotation Test", text: "Cervical spine rotation test", bodyPart: "neck" },
    { id: 8, name: "Lumbar Flexion Test", text: "Lumbar spine flexion test", bodyPart: "back" },
    { id: 9, name: "Ankle Dorsiflexion Test", text: "Ankle dorsiflexion test", bodyPart: "ankle" },
    { id: 10, name: "Ankle Plantarflexion Test", text: "Ankle plantarflexion test", bodyPart: "ankle" },
    { id: 11, name: "Standing March Test", text: "Standing march test - alternating knee lifts", bodyPart: "general" },
    { id: 12, name: "Ankle Inversion Test", text: "Ankle inversion test - subtalar joint movement", bodyPart: "ankle" },
    { id: 13, name: "Ankle Eversion Test", text: "Ankle eversion test - subtalar joint movement", bodyPart: "ankle" }
  ];

  // Exercise movements data
  const exerciseMovements = [
    { id: 1, name: "Squat", text: "Squat exercise", bodyPart: "lower body" },
    { id: 2, name: "Deadlift", text: "Deadlift exercise", bodyPart: "full body" },
    { id: 3, name: "Bridge", text: "Bridge exercise", bodyPart: "glutes" },
    { id: 4, name: "Step-Up", text: "Step-up exercise", bodyPart: "lower body" },
    { id: 5, name: "Bird Dog", text: "Bird dog exercise", bodyPart: "core" },
    { id: 6, name: "Shoulder Press", text: "Shoulder press exercise", bodyPart: "shoulder" },
    { id: 7, name: "Chest Press", text: "Chest press exercise", bodyPart: "chest" },
    { id: 8, name: "Row", text: "Row exercise", bodyPart: "back" },
    { id: 9, name: "Plank", text: "Plank exercise", bodyPart: "core" },
    { id: 10, name: "Side Plank", text: "Side plank exercise", bodyPart: "core" },
    { id: 11, name: "Lunge", text: "Lunge exercise", bodyPart: "lower body" },
    { id: 12, name: "Calf Raise", text: "Calf raise exercise", bodyPart: "calf" }
  ];

  if (patientsLoading || configsLoading) {
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

  if (patientsError || configsError) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-red-600">Error: {(patientsError || configsError)?.toString()}</p>
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
                Virtual Patient Management
              </h1>
              <p className="text-gray-600 mt-2">
                Create and manage virtual patients with customizable pathologies
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setIsCreatingNew(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                New Patient
              </Button>
              <Button variant="outline">
                <Camera className="h-4 w-4 mr-2" />
                Motion Capture
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel - Patient List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Patient List</CardTitle>
                <CardDescription>Select a patient configuration to edit</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {configsArray.length > 0 ? (
                    configsArray.map((config: VirtualPatientConfig) => (
                      <div
                        key={config.id}
                        className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedConfig?.id === config.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                        }`}
                        onClick={() => handleSelectConfig(config)}
                      >
                        <h3 className="font-medium text-gray-900">{config.patient_name}</h3>
                        <p className="text-sm text-gray-500">
                          Created: {new Date(config.createdAt).toLocaleDateString()}
                        </p>
                        {config.soapVirtualPatientId && (
                          <p className="text-xs text-blue-600 mt-1">
                            Linked to SOAP Patient #{config.soapVirtualPatientId}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 px-4">
                      <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-gray-500">No patients created yet</p>
                      <p className="text-sm text-gray-400 mt-1">Click "New Patient" to get started</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* SOAP Virtual Patients */}
            {patientsArray.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">SOAP Patients</CardTitle>
                  <CardDescription>Import from SOAP notes</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y max-h-64 overflow-y-auto">
                    {patientsArray.map((patient: SoapVirtualPatient) => (
                      <div
                        key={patient.id}
                        className="p-3 hover:bg-gray-50 cursor-pointer text-sm"
                        onClick={() => {
                          setSelectedPatient(patient);
                          setIsCreatingNew(true);
                          setEditingName(patient.title || `Patient from SOAP ${patient.id}`);
                        }}
                      >
                        <p className="font-medium">{patient.title || `SOAP Patient ${patient.id}`}</p>
                        <p className="text-xs text-gray-500">{patient.bodyPart}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Configuration */}
          <div className="lg:col-span-3">
            {selectedConfig || isCreatingNew ? (
              <div className="space-y-6">
                {/* Patient Header */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {isCreatingNew ? (
                          <>
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              placeholder="Enter patient name"
                              className="w-64"
                            />
                            <Button
                              onClick={handleCreateConfig}
                              disabled={createConfigMutation.isPending}
                              size="sm"
                            >
                              {createConfigMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              onClick={() => {
                                setIsCreatingNew(false);
                                setEditingName("");
                              }}
                              variant="ghost"
                              size="sm"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            {isEditing ? (
                              <>
                                <Input
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  className="w-64"
                                />
                                <Button
                                  onClick={() => {
                                    updateConfigMutation.mutate({
                                      id: selectedConfig.id,
                                      data: { patient_name: editingName }
                                    });
                                    setIsEditing(false);
                                  }}
                                  size="sm"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => {
                                    setIsEditing(false);
                                    setEditingName(selectedConfig.patient_name);
                                  }}
                                  variant="ghost"
                                  size="sm"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <h2 className="text-xl font-semibold">{selectedConfig.patient_name}</h2>
                                <Button
                                  onClick={() => setIsEditing(true)}
                                  variant="ghost"
                                  size="sm"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                      {selectedConfig && (
                        <div className="flex gap-2">
                          {updateConfigMutation.isPending && (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving...
                            </div>
                          )}
                          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                            <DialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete Patient Configuration</DialogTitle>
                              </DialogHeader>
                              <p>Are you sure you want to delete "{selectedConfig.patient_name}"? This action cannot be undone.</p>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => deleteConfigMutation.mutate(selectedConfig.id)}
                                  disabled={deleteConfigMutation.isPending}
                                >
                                  {deleteConfigMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    'Delete'
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                </Card>

                {/* 3D Preview and Configuration Tabs */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 3D Preview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">3D Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-900 rounded-lg p-4" style={{ height: '500px' }}>
                        <Text3DAnimation
                          clinicalText={selectedTest || selectedExercise || ""}
                          isPlaying={true}
                          selectedSide={selectedSide}
                          limbScales={{
                            upperArm: upperArmScale[0],
                            forearm: forearmScale[0],
                            thigh: thighScale[0],
                            shin: shinScale[0],
                            torso: torsoScale[0],
                            overall: overallScale[0]
                          }}
                          hipPathology={{
                            neckAngle: hipNeckAngle[0],
                            anteversion: hipAnteversion[0],
                            acetabularCoverage: acetabularCoverage[0]
                          }}
                          kneePathology={{
                            varusValgus: kneeVarusValgus[0],
                            patellaHeight: patellaHeight[0],
                            tibialTorsion: tibialTorsion[0]
                          }}
                          shoulderPathology={{
                            scapularWinging: scapularWinging[0],
                            acSeparation: acSeparation[0],
                            ghSubluxation: ghSubluxation[0]
                          }}
                          anthropometric={{
                            height: height[0],
                            weight: weight[0],
                            bodyType: bodyType
                          }}
                          posturalDeviations={{
                            forwardHead: forwardHead[0],
                            thoracicKyphosis: thoracicKyphosis[0],
                            lumbarLordosis: lumbarLordosis[0],
                            pelvicTilt: pelvicTilt[0],
                            shoulderHeight: shoulderHeight[0],
                            scoliosis: scoliosis[0]
                          }}
                          movementQuality={{
                            speed: movementSpeed,
                            balance: balanceQuality,
                            coordination: coordination,
                            compensations: {
                              hipHike,
                              trunkLean,
                              circumduction,
                              trendelenburg
                            }
                          }}
                        />
                      </div>
                      
                      {/* Test/Exercise Selection */}
                      <div className="mt-4 space-y-3">
                        <div>
                          <Label>Assessment Test</Label>
                          <Select value={selectedTest} onValueChange={setSelectedTest}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a test" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {assessmentTests.map(test => (
                                <SelectItem key={test.id} value={test.text}>
                                  {test.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Exercise Movement</Label>
                          <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an exercise" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {exerciseMovements.map(exercise => (
                                <SelectItem key={exercise.id} value={exercise.text}>
                                  {exercise.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Configuration Tabs */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Patient Configuration</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="limbs" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="limbs">Limbs</TabsTrigger>
                          <TabsTrigger value="pathology">Pathology</TabsTrigger>
                          <TabsTrigger value="posture">Posture</TabsTrigger>
                          <TabsTrigger value="movement">Movement</TabsTrigger>
                        </TabsList>

                        {/* Limbs Tab */}
                        <TabsContent value="limbs" className="space-y-4 mt-4">
                          <div>
                            <h3 className="font-medium mb-3">Limb Proportions</h3>
                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Upper Arm</Label>
                                  <span className="text-sm text-gray-600">{upperArmScale[0].toFixed(2)}x</span>
                                </div>
                                <Slider
                                  value={upperArmScale}
                                  onValueChange={setUpperArmScale}
                                  min={0.5}
                                  max={1.5}
                                  step={0.01}
                                />
                              </div>

                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Forearm</Label>
                                  <span className="text-sm text-gray-600">{forearmScale[0].toFixed(2)}x</span>
                                </div>
                                <Slider
                                  value={forearmScale}
                                  onValueChange={setForearmScale}
                                  min={0.5}
                                  max={1.5}
                                  step={0.01}
                                />
                              </div>

                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Thigh</Label>
                                  <span className="text-sm text-gray-600">{thighScale[0].toFixed(2)}x</span>
                                </div>
                                <Slider
                                  value={thighScale}
                                  onValueChange={setThighScale}
                                  min={0.5}
                                  max={1.5}
                                  step={0.01}
                                />
                              </div>

                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Shin</Label>
                                  <span className="text-sm text-gray-600">{shinScale[0].toFixed(2)}x</span>
                                </div>
                                <Slider
                                  value={shinScale}
                                  onValueChange={setShinScale}
                                  min={0.5}
                                  max={1.5}
                                  step={0.01}
                                />
                              </div>

                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Torso</Label>
                                  <span className="text-sm text-gray-600">{torsoScale[0].toFixed(2)}x</span>
                                </div>
                                <Slider
                                  value={torsoScale}
                                  onValueChange={setTorsoScale}
                                  min={0.5}
                                  max={1.5}
                                  step={0.01}
                                />
                              </div>

                              <Separator className="my-3" />

                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Overall Scale</Label>
                                  <span className="text-sm text-gray-600">{overallScale[0].toFixed(2)}x</span>
                                </div>
                                <Slider
                                  value={overallScale}
                                  onValueChange={setOverallScale}
                                  min={0.5}
                                  max={1.5}
                                  step={0.01}
                                />
                              </div>
                            </div>
                          </div>

                          <Separator />

                          <div>
                            <h3 className="font-medium mb-3">Anthropometrics</h3>
                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Height</Label>
                                  <span className="text-sm text-gray-600">{height[0]} cm</span>
                                </div>
                                <Slider
                                  value={height}
                                  onValueChange={setHeight}
                                  min={120}
                                  max={220}
                                  step={1}
                                />
                              </div>

                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Weight</Label>
                                  <span className="text-sm text-gray-600">{weight[0]} kg</span>
                                </div>
                                <Slider
                                  value={weight}
                                  onValueChange={setWeight}
                                  min={30}
                                  max={150}
                                  step={1}
                                />
                              </div>

                              <div>
                                <Label>Body Type</Label>
                                <Select value={bodyType} onValueChange={(value: any) => setBodyType(value)}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="ectomorph">Ectomorph (Lean)</SelectItem>
                                    <SelectItem value="mesomorph">Mesomorph (Athletic)</SelectItem>
                                    <SelectItem value="endomorph">Endomorph (Stocky)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </TabsContent>

                        {/* Pathology Tab */}
                        <TabsContent value="pathology" className="space-y-4 mt-4">
                          <Alert>
                            <AlertDescription>
                              Adjust pathological parameters to simulate various clinical conditions
                            </AlertDescription>
                          </Alert>

                          {/* Hip Pathology */}
                          <div>
                            <h3 className="font-medium mb-3">Hip Pathology</h3>
                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Femoral Neck Angle</Label>
                                  <span className="text-sm text-gray-600">{hipNeckAngle[0]}°</span>
                                </div>
                                <Slider
                                  value={hipNeckAngle}
                                  onValueChange={setHipNeckAngle}
                                  min={110}
                                  max={150}
                                  step={1}
                                />
                                <p className="text-xs text-gray-500 mt-1">Normal: 125-135°</p>
                              </div>

                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Femoral Anteversion</Label>
                                  <span className="text-sm text-gray-600">{hipAnteversion[0]}°</span>
                                </div>
                                <Slider
                                  value={hipAnteversion}
                                  onValueChange={setHipAnteversion}
                                  min={-10}
                                  max={40}
                                  step={1}
                                />
                                <p className="text-xs text-gray-500 mt-1">Normal: 10-15°</p>
                              </div>

                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Acetabular Coverage</Label>
                                  <span className="text-sm text-gray-600">{acetabularCoverage[0]}%</span>
                                </div>
                                <Slider
                                  value={acetabularCoverage}
                                  onValueChange={setAcetabularCoverage}
                                  min={50}
                                  max={100}
                                  step={1}
                                />
                                <p className="text-xs text-gray-500 mt-1">Normal: 70-80%</p>
                              </div>
                            </div>
                          </div>

                          <Separator />

                          {/* Knee Pathology */}
                          <div>
                            <h3 className="font-medium mb-3">Knee Pathology</h3>
                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Varus/Valgus Angle</Label>
                                  <span className="text-sm text-gray-600">
                                    {kneeVarusValgus[0] > 0 ? `${kneeVarusValgus[0]}° Valgus` : 
                                     kneeVarusValgus[0] < 0 ? `${Math.abs(kneeVarusValgus[0])}° Varus` : 'Neutral'}
                                  </span>
                                </div>
                                <Slider
                                  value={kneeVarusValgus}
                                  onValueChange={setKneeVarusValgus}
                                  min={-20}
                                  max={20}
                                  step={1}
                                />
                                <p className="text-xs text-gray-500 mt-1">Normal: 5-7° Valgus</p>
                              </div>

                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Patella Height (Insall-Salvati)</Label>
                                  <span className="text-sm text-gray-600">{patellaHeight[0].toFixed(2)}</span>
                                </div>
                                <Slider
                                  value={patellaHeight}
                                  onValueChange={setPatellaHeight}
                                  min={0.5}
                                  max={1.5}
                                  step={0.01}
                                />
                                <p className="text-xs text-gray-500 mt-1">Normal: 0.8-1.2</p>
                              </div>

                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Tibial Torsion</Label>
                                  <span className="text-sm text-gray-600">{tibialTorsion[0]}°</span>
                                </div>
                                <Slider
                                  value={tibialTorsion}
                                  onValueChange={setTibialTorsion}
                                  min={-20}
                                  max={40}
                                  step={1}
                                />
                                <p className="text-xs text-gray-500 mt-1">Normal: 10-15° External</p>
                              </div>
                            </div>
                          </div>

                          <Separator />

                          {/* Shoulder Pathology */}
                          <div>
                            <h3 className="font-medium mb-3">Shoulder Pathology</h3>
                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Scapular Winging</Label>
                                  <span className="text-sm text-gray-600">{scapularWinging[0]}°</span>
                                </div>
                                <Slider
                                  value={scapularWinging}
                                  onValueChange={setScapularWinging}
                                  min={0}
                                  max={30}
                                  step={1}
                                />
                                <p className="text-xs text-gray-500 mt-1">Normal: 0-5°</p>
                              </div>

                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>AC Joint Separation</Label>
                                  <span className="text-sm text-gray-600">{acSeparation[0]} mm</span>
                                </div>
                                <Slider
                                  value={acSeparation}
                                  onValueChange={setAcSeparation}
                                  min={0}
                                  max={20}
                                  step={1}
                                />
                                <p className="text-xs text-gray-500 mt-1">Normal: 0 mm</p>
                              </div>

                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>GH Joint Subluxation</Label>
                                  <span className="text-sm text-gray-600">{ghSubluxation[0]}%</span>
                                </div>
                                <Slider
                                  value={ghSubluxation}
                                  onValueChange={setGhSubluxation}
                                  min={0}
                                  max={50}
                                  step={1}
                                />
                                <p className="text-xs text-gray-500 mt-1">Normal: 0%</p>
                              </div>
                            </div>
                          </div>

                          <Separator />

                          {/* Ankle Pathology */}
                          <div>
                            <h3 className="font-medium mb-3">Ankle Pathology</h3>
                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Subtalar Joint Stiffness</Label>
                                  <span className="text-sm text-gray-600">{subtalarStiffness[0]}%</span>
                                </div>
                                <Slider
                                  value={subtalarStiffness}
                                  onValueChange={setSubtalarStiffness}
                                  min={0}
                                  max={100}
                                  step={1}
                                />
                                <p className="text-xs text-gray-500 mt-1">0% = Normal mobility</p>
                              </div>

                              <div>
                                <Label>Ankle Instability</Label>
                                <Select 
                                  value={ankleInstability} 
                                  onValueChange={(value: any) => setAnkleInstability(value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="lateral">Lateral</SelectItem>
                                    <SelectItem value="medial">Medial</SelectItem>
                                    <SelectItem value="combined">Combined</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Hindfoot Angle</Label>
                                  <span className="text-sm text-gray-600">
                                    {hindfootAngle[0] > 0 ? `${hindfootAngle[0]}° Valgus` : 
                                     hindfootAngle[0] < 0 ? `${Math.abs(hindfootAngle[0])}° Varus` : 'Neutral'}
                                  </span>
                                </div>
                                <Slider
                                  value={hindfootAngle}
                                  onValueChange={setHindfootAngle}
                                  min={-20}
                                  max={20}
                                  step={1}
                                />
                                <p className="text-xs text-gray-500 mt-1">Normal: 5-10° Valgus</p>
                              </div>

                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Ankle Effusion</Label>
                                  <span className="text-sm text-gray-600">{ankleEffusion[0]}%</span>
                                </div>
                                <Slider
                                  value={ankleEffusion}
                                  onValueChange={setAnkleEffusion}
                                  min={0}
                                  max={100}
                                  step={1}
                                />
                                <p className="text-xs text-gray-500 mt-1">0% = No swelling</p>
                              </div>
                            </div>
                          </div>
                        </TabsContent>

                        {/* Posture Tab */}
                        <TabsContent value="posture" className="space-y-4 mt-4">
                          <div>
                            <h3 className="font-medium mb-3">Spinal Alignment</h3>
                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Forward Head Position</Label>
                                  <span className="text-sm text-gray-600">{forwardHead[0]} cm</span>
                                </div>
                                <Slider
                                  value={forwardHead}
                                  onValueChange={setForwardHead}
                                  min={0}
                                  max={10}
                                  step={0.5}
                                />
                                <p className="text-xs text-gray-500 mt-1">Normal: 0-2 cm</p>
                              </div>

                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Thoracic Kyphosis</Label>
                                  <span className="text-sm text-gray-600">{thoracicKyphosis[0]}°</span>
                                </div>
                                <Slider
                                  value={thoracicKyphosis}
                                  onValueChange={setThoracicKyphosis}
                                  min={20}
                                  max={70}
                                  step={1}
                                />
                                <p className="text-xs text-gray-500 mt-1">Normal: 20-45°</p>
                              </div>

                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Lumbar Lordosis</Label>
                                  <span className="text-sm text-gray-600">{Math.abs(lumbarLordosis[0])}°</span>
                                </div>
                                <Slider
                                  value={lumbarLordosis}
                                  onValueChange={setLumbarLordosis}
                                  min={-80}
                                  max={-20}
                                  step={1}
                                />
                                <p className="text-xs text-gray-500 mt-1">Normal: 40-60°</p>
                              </div>

                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Pelvic Tilt</Label>
                                  <span className="text-sm text-gray-600">
                                    {pelvicTilt[0] > 0 ? `${pelvicTilt[0]}° Anterior` : 
                                     pelvicTilt[0] < 0 ? `${Math.abs(pelvicTilt[0])}° Posterior` : 'Neutral'}
                                  </span>
                                </div>
                                <Slider
                                  value={pelvicTilt}
                                  onValueChange={setPelvicTilt}
                                  min={-20}
                                  max={20}
                                  step={1}
                                />
                                <p className="text-xs text-gray-500 mt-1">Normal: 8-12° Anterior</p>
                              </div>
                            </div>
                          </div>

                          <Separator />

                          <div>
                            <h3 className="font-medium mb-3">Asymmetries</h3>
                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Shoulder Height Difference</Label>
                                  <span className="text-sm text-gray-600">
                                    {shoulderHeight[0] > 0 ? `R ${shoulderHeight[0]} cm higher` : 
                                     shoulderHeight[0] < 0 ? `L ${Math.abs(shoulderHeight[0])} cm higher` : 'Level'}
                                  </span>
                                </div>
                                <Slider
                                  value={shoulderHeight}
                                  onValueChange={setShoulderHeight}
                                  min={-5}
                                  max={5}
                                  step={0.5}
                                />
                              </div>

                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Scoliosis (Cobb Angle)</Label>
                                  <span className="text-sm text-gray-600">{scoliosis[0]}°</span>
                                </div>
                                <Slider
                                  value={scoliosis}
                                  onValueChange={setScoliosis}
                                  min={0}
                                  max={50}
                                  step={1}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  0-10°: Normal, 10-25°: Mild, 25-50°: Moderate
                                </p>
                              </div>
                            </div>
                          </div>
                        </TabsContent>

                        {/* Movement Tab */}
                        <TabsContent value="movement" className="space-y-4 mt-4">
                          <div>
                            <h3 className="font-medium mb-3">Movement Quality</h3>
                            <div className="space-y-3">
                              <div>
                                <Label>Movement Speed</Label>
                                <Select 
                                  value={movementSpeed} 
                                  onValueChange={(value: any) => setMovementSpeed(value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="very_slow">Very Slow</SelectItem>
                                    <SelectItem value="slow">Slow</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="fast">Fast</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label>Balance Quality</Label>
                                <Select 
                                  value={balanceQuality} 
                                  onValueChange={(value: any) => setBalanceQuality(value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="poor">Poor</SelectItem>
                                    <SelectItem value="fair">Fair</SelectItem>
                                    <SelectItem value="good">Good</SelectItem>
                                    <SelectItem value="excellent">Excellent</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label>Movement Coordination</Label>
                                <Select 
                                  value={coordination} 
                                  onValueChange={(value: any) => setCoordination(value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="smooth">Smooth</SelectItem>
                                    <SelectItem value="mildly_jerky">Mildly Jerky</SelectItem>
                                    <SelectItem value="moderately_jerky">Moderately Jerky</SelectItem>
                                    <SelectItem value="severely_jerky">Severely Jerky</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          <Separator />

                          <div>
                            <h3 className="font-medium mb-3">Gait Compensations</h3>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label>Hip Hike</Label>
                                <Switch
                                  checked={hipHike}
                                  onCheckedChange={setHipHike}
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <Label>Trunk Lean</Label>
                                <Switch
                                  checked={trunkLean}
                                  onCheckedChange={setTrunkLean}
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <Label>Circumduction</Label>
                                <Switch
                                  checked={circumduction}
                                  onCheckedChange={setCircumduction}
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <Label>Trendelenburg Sign</Label>
                                <Switch
                                  checked={trendelenburg}
                                  onCheckedChange={setTrendelenburg}
                                />
                              </div>
                            </div>
                          </div>

                          <Separator />

                          <div>
                            <h3 className="font-medium mb-3">Movement Controls</h3>
                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Animation Speed</Label>
                                  <span className="text-sm text-gray-600">{animationSpeed[0].toFixed(1)}x</span>
                                </div>
                                <Slider
                                  value={animationSpeed}
                                  onValueChange={setAnimationSpeed}
                                  min={0.1}
                                  max={2}
                                  step={0.1}
                                />
                              </div>

                              <div>
                                <div className="flex justify-between mb-1">
                                  <Label>Repetitions</Label>
                                  <span className="text-sm text-gray-600">{repetitions[0]}</span>
                                </div>
                                <Slider
                                  value={repetitions}
                                  onValueChange={setRepetitions}
                                  min={1}
                                  max={30}
                                  step={1}
                                />
                              </div>

                              <div>
                                <Label>Movement Side</Label>
                                <Select 
                                  value={selectedSide} 
                                  onValueChange={(value: any) => setSelectedSide(value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="both">Both Sides</SelectItem>
                                    <SelectItem value="left">Left Side Only</SelectItem>
                                    <SelectItem value="right">Right Side Only</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="py-16">
                  <div className="text-center">
                    <Settings className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No Patient Selected</h3>
                    <p className="text-gray-500 mb-6">
                      Select an existing patient or create a new one to start configuring
                    </p>
                    <Button 
                      onClick={() => setIsCreatingNew(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create New Patient
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}