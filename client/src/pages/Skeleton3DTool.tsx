import { Helmet } from "react-helmet";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import Enhanced3DSkeleton from "@/components/3d/Enhanced3DSkeleton";
import MotionCapture from "@/components/MotionCapture";
import MotionProcessor from "@/components/MotionProcessor";
import { useAuth } from "@/hooks/use-auth";
import { 
  User, 
  Ruler, 
  Activity, 
  Target, 
  Play, 
  Pause, 
  RotateCcw, 
  Download,
  Save,
  AlertTriangle,
  Settings,
  Eye,
  Move3D,
  Zap,
  Camera,
  Users
} from "lucide-react";

export default function Skeleton3DTool() {
  const [isSaved, setIsSaved] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const { user } = useAuth();
  
  // Anthropometric State Management
  const [anthropometrics, setAnthropometrics] = useState({
    height: 175,
    weight: 70,
    age: 35,
    gender: 'male',
    bodyType: 'average',
    limbLengths: {
      upperArm: 35,
      forearm: 28,
      thigh: 45,
      shin: 38,
      torsoLength: 60,
      shoulderWidth: 45
    }
  });

  // Joint Range of Motion State
  const [jointROM, setJointROM] = useState({
    shoulder: { flexion: 180, extension: 60, abduction: 180, adduction: 30, rotation: 90 },
    elbow: { flexion: 145, extension: 0 },
    wrist: { flexion: 80, extension: 70, deviation: 30 },
    hip: { flexion: 120, extension: 30, abduction: 45, adduction: 30 },
    knee: { flexion: 135, extension: 0 },
    ankle: { flexion: 20, extension: 50, inversion: 35, eversion: 15 }
  });

  // Movement and Assessment State
  const [movementData, setMovementData] = useState({
    selectedMovement: 'idle',
    playbackSpeed: 1.0,
    showJointLimits: true,
    showPainAreas: true,
    viewMode: 'anatomical'
  });

  // Pain and Pathology Areas
  const [painAreas, setPainAreas] = useState(['shoulder', 'lower_back']);
  const [pathologyData, setPathologyData] = useState({
    conditions: [],
    restrictions: [],
    compensations: []
  });

  // Available movements for demonstration
  const movements = [
    { value: 'idle', label: 'Neutral Position' },
    { value: 'walking', label: 'Walking Gait' },
    { value: 'squat', label: 'Squat Pattern' },
    { value: 'shoulder_flexion', label: 'Shoulder Flexion' },
    { value: 'reach_overhead', label: 'Overhead Reach' },
    { value: 'step_up', label: 'Step Up' },
    { value: 'lunge', label: 'Forward Lunge' },
    { value: 'balance_single_leg', label: 'Single Leg Balance' }
  ];

  // Body part options for pain mapping
  const bodyParts = [
    'head', 'neck', 'shoulder', 'upper_arm', 'elbow', 'forearm', 'wrist', 'hand',
    'chest', 'upper_back', 'lower_back', 'hip', 'thigh', 'knee', 'shin', 'ankle', 'foot'
  ];

  // Update anthropometric data
  const updateAnthropometrics = (field: string, value: any) => {
    setAnthropometrics(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Update limb lengths
  const updateLimbLength = (limb: string, value: number) => {
    setAnthropometrics(prev => ({
      ...prev,
      limbLengths: {
        ...prev.limbLengths,
        [limb]: value
      }
    }));
  };

  // Update joint ROM
  const updateJointROM = (joint: string, movement: string, value: number) => {
    setJointROM(prev => ({
      ...prev,
      [joint]: {
        ...(prev as any)[joint],
        [movement]: value
      }
    }));
  };

  // Toggle pain areas
  const togglePainArea = (area: string) => {
    setPainAreas(prev => 
      prev.includes(area) 
        ? prev.filter(p => p !== area)
        : [...prev, area]
    );
  };

  // Generate patient data for 3D model
  const generatePatientData = () => ({
    anthropometrics,
    jointRestrictions: jointROM,
    painAreas,
    pathology: pathologyData,
    movements: movementData
  });

  const handleSaveModel = () => {
    if (!user) {
      alert("Please sign in to save your model");
      return;
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleExportImage = () => {
    alert("Export functionality will be available in the next update");
  };

  const handlePlayMovement = () => {
    setIsPlaying(!isPlaying);
  };

  const resetToDefaults = () => {
    setAnthropometrics({
      height: 175,
      weight: 70,
      age: 35,
      gender: 'male',
      bodyType: 'average',
      limbLengths: {
        upperArm: 35,
        forearm: 28,
        thigh: 45,
        shin: 38,
        torsoLength: 60,
        shoulderWidth: 45
      }
    });
    setJointROM({
      shoulder: { flexion: 180, extension: 60, abduction: 180, adduction: 30, rotation: 90 },
      elbow: { flexion: 145, extension: 0 },
      wrist: { flexion: 80, extension: 70, deviation: 30 },
      hip: { flexion: 120, extension: 30, abduction: 45, adduction: 30 },
      knee: { flexion: 135, extension: 0 },
      ankle: { flexion: 20, extension: 50, inversion: 35, eversion: 15 }
    });
    setPainAreas([]);
  };

  return (
    <div className="container max-w-7xl py-8 mx-auto">
      <Helmet>
        <title>3D Skeletal Model Creator | PhysioAI</title>
        <meta name="description" content="Create and customize 3D skeletal models with anthropometric data, movement patterns, and clinical assessments." />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Move3D className="h-8 w-8 text-blue-600" />
            3D Skeletal Model Creator
          </h1>
          <p className="text-muted-foreground mt-2">
            Build patient-specific 3D skeletal models with anthropometric data, movement patterns, and clinical assessments
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center">
          <div className="flex gap-3">
            <Button 
              variant={isSaved ? "default" : "outline"} 
              onClick={handleSaveModel}
              className={isSaved ? "bg-green-600 hover:bg-green-700" : ""}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaved ? "Model Saved!" : "Save Model"}
            </Button>
            <Button variant="outline" onClick={handleExportImage}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={resetToDefaults}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="px-3 py-1">
              <Eye className="h-3 w-3 mr-1" />
              {movementData.viewMode}
            </Badge>
            <Badge variant={isPlaying ? "default" : "outline"}>
              {isPlaying ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
              {isPlaying ? "Playing" : "Paused"}
            </Badge>
          </div>
        </div>

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 3D Viewport */}
          <div className="lg:col-span-3">
            <Card className="h-[700px]">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    3D Patient Model
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant={isPlaying ? "default" : "outline"}
                      onClick={handlePlayMovement}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Select 
                      value={movementData.selectedMovement} 
                      onValueChange={(value) => setMovementData(prev => ({...prev, selectedMovement: value}))}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {movements.map(movement => (
                          <SelectItem key={movement.value} value={movement.value}>
                            {movement.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 h-[600px]">
                <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border">
                  <Enhanced3DSkeleton 
                    patientData={generatePatientData()}
                    className="h-full"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Control Panels */}
          <div className="space-y-4">
            <Tabs defaultValue="anthropometrics" className="w-full">
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="anthropometrics" className="text-xs">
                  <User className="h-3 w-3 mr-1" />
                  Patient Data
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="anthropometrics" className="space-y-4">
                {/* Basic Demographics */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Demographics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Height (cm)</Label>
                        <Input
                          type="number"
                          value={anthropometrics.height}
                          onChange={(e) => updateAnthropometrics('height', parseInt(e.target.value))}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Weight (kg)</Label>
                        <Input
                          type="number"
                          value={anthropometrics.weight}
                          onChange={(e) => updateAnthropometrics('weight', parseInt(e.target.value))}
                          className="h-8"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Age</Label>
                        <Input
                          type="number"
                          value={anthropometrics.age}
                          onChange={(e) => updateAnthropometrics('age', parseInt(e.target.value))}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Gender</Label>
                        <Select value={anthropometrics.gender} onValueChange={(value) => updateAnthropometrics('gender', value)}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Body Type</Label>
                      <Select value={anthropometrics.bodyType} onValueChange={(value) => updateAnthropometrics('bodyType', value)}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="slim">Slim</SelectItem>
                          <SelectItem value="average">Average</SelectItem>
                          <SelectItem value="athletic">Athletic</SelectItem>
                          <SelectItem value="heavy">Heavy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Limb Measurements */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Ruler className="h-4 w-4" />
                      Limb Lengths (cm)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(anthropometrics.limbLengths).map(([limb, value]) => (
                      <div key={limb}>
                        <Label className="text-xs capitalize">{limb.replace(/([A-Z])/g, ' $1')}</Label>
                        <div className="flex items-center space-x-2">
                          <Slider
                            value={[value]}
                            onValueChange={([newValue]) => updateLimbLength(limb, newValue)}
                            min={10}
                            max={80}
                            step={1}
                            className="flex-1"
                          />
                          <span className="text-xs w-8 text-right">{value}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Joint Range of Motion */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Joint ROM (degrees)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(jointROM).map(([joint, movements]) => (
                      <div key={joint} className="space-y-2">
                        <Label className="text-xs font-medium capitalize">{joint}</Label>
                        {Object.entries(movements).map(([movement, value]) => (
                          <div key={movement} className="flex items-center justify-between">
                            <span className="text-xs capitalize">{movement}</span>
                            <div className="flex items-center space-x-2">
                              <Slider
                                value={[value]}
                                onValueChange={([newValue]) => updateJointROM(joint, movement, newValue)}
                                min={0}
                                max={200}
                                step={5}
                                className="w-20"
                              />
                              <span className="text-xs w-8 text-right">{value}°</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Pain Areas */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Pain Areas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {bodyParts.map(part => (
                        <div key={part} className="flex items-center space-x-2">
                          <Checkbox
                            id={part}
                            checked={painAreas.includes(part)}
                            onCheckedChange={() => togglePainArea(part)}
                          />
                          <Label htmlFor={part} className="text-xs capitalize cursor-pointer">
                            {part.replace('_', ' ')}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Movement Controls */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Movement Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs">Playback Speed</Label>
                      <Slider
                        value={[movementData.playbackSpeed]}
                        onValueChange={([value]) => setMovementData(prev => ({...prev, playbackSpeed: value}))}
                        min={0.1}
                        max={2.0}
                        step={0.1}
                        className="mt-1"
                      />
                      <div className="text-xs text-muted-foreground text-center">{movementData.playbackSpeed.toFixed(1)}x</div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="showJointLimits"
                          checked={movementData.showJointLimits}
                          onCheckedChange={(checked) => setMovementData(prev => ({...prev, showJointLimits: !!checked}))}
                        />
                        <Label htmlFor="showJointLimits" className="text-xs">Show Joint Limits</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="showPainAreas"
                          checked={movementData.showPainAreas}
                          onCheckedChange={(checked) => setMovementData(prev => ({...prev, showPainAreas: !!checked}))}
                        />
                        <Label htmlFor="showPainAreas" className="text-xs">Highlight Pain Areas</Label>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">View Mode</Label>
                      <Select 
                        value={movementData.viewMode} 
                        onValueChange={(value) => setMovementData(prev => ({...prev, viewMode: value}))}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="anatomical">Anatomical</SelectItem>
                          <SelectItem value="clinical">Clinical Assessment</SelectItem>
                          <SelectItem value="movement">Movement Analysis</SelectItem>
                          <SelectItem value="comparison">Normal Comparison</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Model Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Model Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <h4 className="font-medium mb-2">Patient Profile</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>{anthropometrics.gender}, {anthropometrics.age} years old</li>
                  <li>{anthropometrics.height}cm, {anthropometrics.weight}kg</li>
                  <li>Body type: {anthropometrics.bodyType}</li>
                  <li>BMI: {(anthropometrics.weight / (anthropometrics.height/100) ** 2).toFixed(1)}</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Movement Analysis</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>Current movement: {movements.find(m => m.value === movementData.selectedMovement)?.label}</li>
                  <li>Playback speed: {movementData.playbackSpeed}x</li>
                  <li>View mode: {movementData.viewMode}</li>
                  <li>Joint limits: {movementData.showJointLimits ? 'Visible' : 'Hidden'}</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Clinical Notes</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>Pain areas: {painAreas.length > 0 ? painAreas.join(', ') : 'None'}</li>
                  <li>ROM restrictions: {Object.values(jointROM).some(joint => Object.values(joint).some(val => val < 90)) ? 'Present' : 'None detected'}</li>
                  <li>Assessment mode: {movementData.viewMode === 'clinical' ? 'Active' : 'Standard'}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}