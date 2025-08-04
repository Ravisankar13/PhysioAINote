import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Users, Camera, Activity, Stethoscope, Dumbbell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import Text3DAnimation from "@/components/Text3DAnimation";
import type { SoapVirtualPatient } from "@shared/schema";

export default function VirtualPatientsFixed() {
  const [selectedPatient, setSelectedPatient] = useState<SoapVirtualPatient | null>(null);
  const [selectedTest, setSelectedTest] = useState<string>("");
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [animationSpeed, setAnimationSpeed] = useState<number[]>([1]);
  const [repetitions, setRepetitions] = useState<number[]>([10]);
  const [selectedSide, setSelectedSide] = useState<'both' | 'left' | 'right'>('both');
  
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

  // Get all virtual patients for user
  const { data: virtualPatients = [], isLoading: patientsLoading, error } = useQuery({
    queryKey: ["/api/virtual-patients"],
  });

  const patientsArray = Array.isArray(virtualPatients) ? virtualPatients : [];

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
            <p className="text-red-600">Error: {error.toString()}</p>
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
                Virtual Patients & Assessment Tests
              </h1>
              <p className="text-gray-600 mt-2">
                Clinical assessment tests with 3D animated demonstrations
              </p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Camera className="h-4 w-4 mr-2" />
              Motion Capture
            </Button>
          </div>
        </div>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="patients" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="patients">Virtual Patients</TabsTrigger>
            <TabsTrigger value="tests">Assessment Tests</TabsTrigger>
          </TabsList>
          
          {/* Virtual Patients Tab */}
          <TabsContent value="patients">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Patient Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Patient List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {patientsArray.length > 0 ? (
                  patientsArray.map((patient: SoapVirtualPatient) => (
                    <Card 
                      key={patient.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedPatient?.id === patient.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => setSelectedPatient(patient)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {patient.title || `Patient ${patient.id}`}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Body Part: {patient.bodyPart || 'Not specified'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>No virtual patients found</p>
                    <p className="text-sm text-gray-400">Create a new patient to get started</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right Panel - Patient Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Patient Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedPatient ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Patient Information</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p><strong>ID:</strong> {selectedPatient.id}</p>
                      <p><strong>Title:</strong> {selectedPatient.title}</p>
                      <p><strong>Body Part:</strong> {selectedPatient.bodyPart}</p>
                      <p><strong>User ID:</strong> {selectedPatient.userId}</p>
                    </div>
                  </div>
                  
                  {selectedPatient.patientProfile && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Patient Profile</h3>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        {typeof selectedPatient.patientProfile === 'object' ? (
                          <>
                            <p><strong>Name:</strong> {selectedPatient.patientProfile.name || 'N/A'}</p>
                            <p><strong>Age:</strong> {selectedPatient.patientProfile.age || 'N/A'}</p>
                            <p><strong>Gender:</strong> {selectedPatient.patientProfile.gender || 'N/A'}</p>
                          </>
                        ) : (
                          <p>{selectedPatient.patientProfile}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedPatient.motionData && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Motion Data</h3>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p>Motion data available</p>
                        <p className="text-sm text-gray-600">
                          Type: {typeof selectedPatient.motionData}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>Select a patient to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
          </TabsContent>
          
          {/* Assessment Tests Tab */}
          <TabsContent value="tests">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Panel - Test and Exercise Selection */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">
                    <Stethoscope className="h-5 w-5 inline-block mr-2" />
                    Tests & Exercises
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Assessment Tests */}
                    <div>
                      <h4 className="font-medium mb-2 text-gray-700">Assessment Tests</h4>
                      
                      {/* Side Selection */}
                      <div className="mb-4 p-3 border rounded-lg bg-gray-50">
                        <Label className="text-sm font-medium mb-2 block">Select Side</Label>
                        <div className="flex gap-2">
                          <Button
                            variant={selectedSide === 'both' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedSide('both')}
                            className="flex-1"
                          >
                            Both
                          </Button>
                          <Button
                            variant={selectedSide === 'left' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedSide('left')}
                            className="flex-1"
                          >
                            Left
                          </Button>
                          <Button
                            variant={selectedSide === 'right' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedSide('right')}
                            className="flex-1"
                          >
                            Right
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {assessmentTests.map((test) => (
                          <Button
                            key={test.id}
                            variant={selectedTest === test.text ? "default" : "outline"}
                            className="w-full justify-start text-left"
                            onClick={() => {
                              setSelectedTest(test.text);
                              setSelectedExercise("");
                            }}
                          >
                            <Activity className="h-4 w-4 mr-2" />
                            {test.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Exercise Movements */}
                    <div>
                      <h4 className="font-medium mb-2 text-gray-700">Exercise Movements</h4>
                      <div className="space-y-2">
                        {exerciseMovements.map((exercise) => (
                          <Button
                            key={exercise.id}
                            variant={selectedExercise === exercise.text ? "default" : "outline"}
                            className="w-full justify-start text-left"
                            onClick={() => {
                              setSelectedExercise(exercise.text);
                              setSelectedTest("");
                            }}
                          >
                            <Dumbbell className="h-4 w-4 mr-2" />
                            {exercise.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Right Panel - 3D Animation and Controls */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">
                    3D Movement Demonstration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedTest || selectedExercise ? (
                    <div className="space-y-4">
                      <div className="bg-gray-100 rounded-lg p-4">
                        <Text3DAnimation 
                          clinicalText={selectedTest || selectedExercise}
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
                              hipHike: hipHike,
                              trunkLean: trunkLean,
                              circumduction: circumduction,
                              trendelenburg: trendelenburg
                            }
                          }}
                        />
                      </div>
                      
                      {/* Control Sliders */}
                      <div className="space-y-4 p-4 bg-gray-50 rounded-lg max-h-[600px] overflow-y-auto">
                        {/* Animation Controls */}
                        <div className="pb-4 border-b">
                          <h4 className="font-medium mb-3">Animation Controls</h4>
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm font-medium">Animation Speed</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">0.5x</span>
                                <Slider
                                  value={animationSpeed}
                                  onValueChange={setAnimationSpeed}
                                  min={0.5}
                                  max={2}
                                  step={0.1}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">2x</span>
                                <span className="text-sm font-medium ml-2">{animationSpeed[0]}x</span>
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Repetitions</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">1</span>
                                <Slider
                                  value={repetitions}
                                  onValueChange={setRepetitions}
                                  min={1}
                                  max={20}
                                  step={1}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">20</span>
                                <span className="text-sm font-medium ml-2">{repetitions[0]} reps</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Limb Length Controls */}
                        <div className="pb-4 border-b">
                          <h4 className="font-medium mb-3">Limb Lengths</h4>
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm font-medium">Upper Arm Length</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">0.5</span>
                                <Slider
                                  value={upperArmScale}
                                  onValueChange={setUpperArmScale}
                                  min={0.5}
                                  max={1.5}
                                  step={0.05}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">1.5</span>
                                <span className="text-sm font-medium ml-2">{upperArmScale[0].toFixed(2)}</span>
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Forearm Length</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">0.5</span>
                                <Slider
                                  value={forearmScale}
                                  onValueChange={setForearmScale}
                                  min={0.5}
                                  max={1.5}
                                  step={0.05}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">1.5</span>
                                <span className="text-sm font-medium ml-2">{forearmScale[0].toFixed(2)}</span>
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Thigh Length</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">0.5</span>
                                <Slider
                                  value={thighScale}
                                  onValueChange={setThighScale}
                                  min={0.5}
                                  max={1.5}
                                  step={0.05}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">1.5</span>
                                <span className="text-sm font-medium ml-2">{thighScale[0].toFixed(2)}</span>
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Shin Length</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">0.5</span>
                                <Slider
                                  value={shinScale}
                                  onValueChange={setShinScale}
                                  min={0.5}
                                  max={1.5}
                                  step={0.05}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">1.5</span>
                                <span className="text-sm font-medium ml-2">{shinScale[0].toFixed(2)}</span>
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Torso Length</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">0.5</span>
                                <Slider
                                  value={torsoScale}
                                  onValueChange={setTorsoScale}
                                  min={0.5}
                                  max={1.5}
                                  step={0.05}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">1.5</span>
                                <span className="text-sm font-medium ml-2">{torsoScale[0].toFixed(2)}</span>
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Overall Scale</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">0.5</span>
                                <Slider
                                  value={overallScale}
                                  onValueChange={setOverallScale}
                                  min={0.5}
                                  max={1.5}
                                  step={0.05}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">1.5</span>
                                <span className="text-sm font-medium ml-2">{overallScale[0].toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Hip Pathology Controls */}
                        <div className="pb-4 border-b">
                          <h4 className="font-medium mb-3">Hip Pathology</h4>
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm font-medium">Neck-Shaft Angle (Coxa Vara/Valga)</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">110°</span>
                                <Slider
                                  value={hipNeckAngle}
                                  onValueChange={setHipNeckAngle}
                                  min={110}
                                  max={150}
                                  step={1}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">150°</span>
                                <span className="text-sm font-medium ml-2">{hipNeckAngle[0]}°</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Normal: 125-135°, &lt;120° = Coxa vara, &gt;140° = Coxa valga</p>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Femoral Anteversion/Retroversion</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">-10°</span>
                                <Slider
                                  value={hipAnteversion}
                                  onValueChange={setHipAnteversion}
                                  min={-10}
                                  max={40}
                                  step={1}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">40°</span>
                                <span className="text-sm font-medium ml-2">{hipAnteversion[0]}°</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Normal: 10-15°, Negative = Retroversion, &gt;15° = Anteversion</p>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Acetabular Coverage</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">50%</span>
                                <Slider
                                  value={acetabularCoverage}
                                  onValueChange={setAcetabularCoverage}
                                  min={50}
                                  max={100}
                                  step={1}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">100%</span>
                                <span className="text-sm font-medium ml-2">{acetabularCoverage[0]}%</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Knee Pathology Controls */}
                        <div className="pb-4 border-b">
                          <h4 className="font-medium mb-3">Knee Pathology</h4>
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm font-medium">Varus/Valgus Angle</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">-15°</span>
                                <Slider
                                  value={kneeVarusValgus}
                                  onValueChange={setKneeVarusValgus}
                                  min={-15}
                                  max={15}
                                  step={1}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">15°</span>
                                <span className="text-sm font-medium ml-2">{kneeVarusValgus[0]}°</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Negative = Varus (bow-legged), Positive = Valgus (knock-kneed)</p>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Patella Height (Insall-Salvati)</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">0.5</span>
                                <Slider
                                  value={patellaHeight}
                                  onValueChange={setPatellaHeight}
                                  min={0.5}
                                  max={1.5}
                                  step={0.05}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">1.5</span>
                                <span className="text-sm font-medium ml-2">{patellaHeight[0].toFixed(2)}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Normal: 0.8-1.2, &lt;0.8 = Patella baja, &gt;1.2 = Patella alta</p>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Tibial Torsion</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">-20°</span>
                                <Slider
                                  value={tibialTorsion}
                                  onValueChange={setTibialTorsion}
                                  min={-20}
                                  max={40}
                                  step={1}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">40°</span>
                                <span className="text-sm font-medium ml-2">{tibialTorsion[0]}°</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Ankle Pathology Controls */}
                        <div className="pb-4 border-b">
                          <h4 className="font-medium mb-3">Ankle Pathology</h4>
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm font-medium">Subtalar Joint Stiffness</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">0%</span>
                                <Slider
                                  value={subtalarStiffness}
                                  onValueChange={setSubtalarStiffness}
                                  min={0}
                                  max={100}
                                  step={5}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">100%</span>
                                <span className="text-sm font-medium ml-2">{subtalarStiffness[0]}%</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Affects inversion/eversion range of motion</p>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Ankle Instability</Label>
                              <div className="flex gap-2 mt-2">
                                <Button 
                                  variant={ankleInstability === 'none' ? "default" : "outline"} 
                                  size="sm"
                                  onClick={() => setAnkleInstability('none')}
                                >
                                  None
                                </Button>
                                <Button 
                                  variant={ankleInstability === 'lateral' ? "default" : "outline"} 
                                  size="sm"
                                  onClick={() => setAnkleInstability('lateral')}
                                >
                                  Lateral
                                </Button>
                                <Button 
                                  variant={ankleInstability === 'medial' ? "default" : "outline"} 
                                  size="sm"
                                  onClick={() => setAnkleInstability('medial')}
                                >
                                  Medial
                                </Button>
                                <Button 
                                  variant={ankleInstability === 'combined' ? "default" : "outline"} 
                                  size="sm"
                                  onClick={() => setAnkleInstability('combined')}
                                >
                                  Combined
                                </Button>
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Hindfoot Varus/Valgus</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">-15°</span>
                                <Slider
                                  value={hindfootAngle}
                                  onValueChange={setHindfootAngle}
                                  min={-15}
                                  max={15}
                                  step={1}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">15°</span>
                                <span className="text-sm font-medium ml-2">{hindfootAngle[0]}°</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Negative = Varus, Positive = Valgus</p>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Ankle Joint Effusion</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">0%</span>
                                <Slider
                                  value={ankleEffusion}
                                  onValueChange={setAnkleEffusion}
                                  min={0}
                                  max={100}
                                  step={5}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">100%</span>
                                <span className="text-sm font-medium ml-2">{ankleEffusion[0]}%</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Shoulder Pathology Controls */}
                        <div>
                          <h4 className="font-medium mb-3">Shoulder Pathology</h4>
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm font-medium">Scapular Winging</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">0°</span>
                                <Slider
                                  value={scapularWinging}
                                  onValueChange={setScapularWinging}
                                  min={0}
                                  max={20}
                                  step={1}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">20°</span>
                                <span className="text-sm font-medium ml-2">{scapularWinging[0]}°</span>
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">AC Joint Separation</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">0mm</span>
                                <Slider
                                  value={acSeparation}
                                  onValueChange={setAcSeparation}
                                  min={0}
                                  max={20}
                                  step={1}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">20mm</span>
                                <span className="text-sm font-medium ml-2">{acSeparation[0]}mm</span>
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">GH Joint Subluxation</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">0mm</span>
                                <Slider
                                  value={ghSubluxation}
                                  onValueChange={setGhSubluxation}
                                  min={0}
                                  max={15}
                                  step={1}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">15mm</span>
                                <span className="text-sm font-medium ml-2">{ghSubluxation[0]}mm</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Anthropometric Measurements */}
                        <div className="pb-4 border-b">
                          <h4 className="font-medium mb-3">Anthropometric Measurements</h4>
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm font-medium">Height (cm)</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">140</span>
                                <Slider
                                  value={height}
                                  onValueChange={setHeight}
                                  min={140}
                                  max={220}
                                  step={1}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">220</span>
                                <span className="text-sm font-medium ml-2">{height[0]} cm</span>
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Weight (kg)</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">40</span>
                                <Slider
                                  value={weight}
                                  onValueChange={setWeight}
                                  min={40}
                                  max={150}
                                  step={1}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">150</span>
                                <span className="text-sm font-medium ml-2">{weight[0]} kg</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">BMI: {(weight[0] / ((height[0] / 100) ** 2)).toFixed(1)}</p>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Body Type</Label>
                              <div className="flex gap-2 mt-2">
                                <Button 
                                  variant={bodyType === 'ectomorph' ? "default" : "outline"} 
                                  size="sm"
                                  onClick={() => setBodyType('ectomorph')}
                                >
                                  Ectomorph
                                </Button>
                                <Button 
                                  variant={bodyType === 'mesomorph' ? "default" : "outline"} 
                                  size="sm"
                                  onClick={() => setBodyType('mesomorph')}
                                >
                                  Mesomorph
                                </Button>
                                <Button 
                                  variant={bodyType === 'endomorph' ? "default" : "outline"} 
                                  size="sm"
                                  onClick={() => setBodyType('endomorph')}
                                >
                                  Endomorph
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Postural Deviations */}
                        <div className="pb-4 border-b">
                          <h4 className="font-medium mb-3">Postural Deviations</h4>
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm font-medium">Forward Head Posture (cm)</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">0</span>
                                <Slider
                                  value={forwardHead}
                                  onValueChange={setForwardHead}
                                  min={0}
                                  max={10}
                                  step={0.5}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">10</span>
                                <span className="text-sm font-medium ml-2">{forwardHead[0]} cm</span>
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Thoracic Kyphosis</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">10°</span>
                                <Slider
                                  value={thoracicKyphosis}
                                  onValueChange={setThoracicKyphosis}
                                  min={10}
                                  max={70}
                                  step={1}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">70°</span>
                                <span className="text-sm font-medium ml-2">{thoracicKyphosis[0]}°</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Normal: 20-45°</p>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Lumbar Lordosis</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">-20°</span>
                                <Slider
                                  value={lumbarLordosis}
                                  onValueChange={setLumbarLordosis}
                                  min={-80}
                                  max={-20}
                                  step={1}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">-80°</span>
                                <span className="text-sm font-medium ml-2">{lumbarLordosis[0]}°</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Normal: -40° to -60°</p>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Pelvic Tilt</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">-10°</span>
                                <Slider
                                  value={pelvicTilt}
                                  onValueChange={setPelvicTilt}
                                  min={-10}
                                  max={25}
                                  step={1}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">25°</span>
                                <span className="text-sm font-medium ml-2">{pelvicTilt[0]}°</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Negative = Posterior, Positive = Anterior. Normal: 5-12°</p>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Shoulder Height Difference</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">-5cm</span>
                                <Slider
                                  value={shoulderHeight}
                                  onValueChange={setShoulderHeight}
                                  min={-5}
                                  max={5}
                                  step={0.5}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">5cm</span>
                                <span className="text-sm font-medium ml-2">{shoulderHeight[0]}cm</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Negative = Left lower, Positive = Right lower</p>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Scoliosis Angle</Label>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-sm text-gray-600">0°</span>
                                <Slider
                                  value={scoliosis}
                                  onValueChange={setScoliosis}
                                  min={0}
                                  max={40}
                                  step={1}
                                  className="flex-1"
                                />
                                <span className="text-sm text-gray-600">40°</span>
                                <span className="text-sm font-medium ml-2">{scoliosis[0]}°</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">&lt;10° = Normal, 10-25° = Mild, 25-40° = Moderate</p>
                            </div>
                          </div>
                        </div>

                        {/* Movement Quality */}
                        <div>
                          <h4 className="font-medium mb-3">Movement Quality</h4>
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm font-medium">Movement Speed</Label>
                              <div className="flex gap-2 mt-2">
                                <Button 
                                  variant={movementSpeed === 'very_slow' ? "default" : "outline"} 
                                  size="sm"
                                  onClick={() => setMovementSpeed('very_slow')}
                                >
                                  Very Slow
                                </Button>
                                <Button 
                                  variant={movementSpeed === 'slow' ? "default" : "outline"} 
                                  size="sm"
                                  onClick={() => setMovementSpeed('slow')}
                                >
                                  Slow
                                </Button>
                                <Button 
                                  variant={movementSpeed === 'normal' ? "default" : "outline"} 
                                  size="sm"
                                  onClick={() => setMovementSpeed('normal')}
                                >
                                  Normal
                                </Button>
                                <Button 
                                  variant={movementSpeed === 'fast' ? "default" : "outline"} 
                                  size="sm"
                                  onClick={() => setMovementSpeed('fast')}
                                >
                                  Fast
                                </Button>
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Balance Quality</Label>
                              <div className="flex gap-2 mt-2">
                                <Button 
                                  variant={balanceQuality === 'poor' ? "default" : "outline"} 
                                  size="sm"
                                  onClick={() => setBalanceQuality('poor')}
                                >
                                  Poor
                                </Button>
                                <Button 
                                  variant={balanceQuality === 'fair' ? "default" : "outline"} 
                                  size="sm"
                                  onClick={() => setBalanceQuality('fair')}
                                >
                                  Fair
                                </Button>
                                <Button 
                                  variant={balanceQuality === 'good' ? "default" : "outline"} 
                                  size="sm"
                                  onClick={() => setBalanceQuality('good')}
                                >
                                  Good
                                </Button>
                                <Button 
                                  variant={balanceQuality === 'excellent' ? "default" : "outline"} 
                                  size="sm"
                                  onClick={() => setBalanceQuality('excellent')}
                                >
                                  Excellent
                                </Button>
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Coordination</Label>
                              <div className="flex gap-2 mt-2">
                                <Button 
                                  variant={coordination === 'smooth' ? "default" : "outline"} 
                                  size="sm"
                                  onClick={() => setCoordination('smooth')}
                                >
                                  Smooth
                                </Button>
                                <Button 
                                  variant={coordination === 'mildly_jerky' ? "default" : "outline"} 
                                  size="sm"
                                  onClick={() => setCoordination('mildly_jerky')}
                                >
                                  Mildly Jerky
                                </Button>
                                <Button 
                                  variant={coordination === 'moderately_jerky' ? "default" : "outline"} 
                                  size="sm"
                                  onClick={() => setCoordination('moderately_jerky')}
                                >
                                  Moderately Jerky
                                </Button>
                                <Button 
                                  variant={coordination === 'severely_jerky' ? "default" : "outline"} 
                                  size="sm"
                                  onClick={() => setCoordination('severely_jerky')}
                                >
                                  Severely Jerky
                                </Button>
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Compensatory Patterns</Label>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <label className="flex items-center">
                                  <input 
                                    type="checkbox" 
                                    className="mr-2" 
                                    checked={hipHike}
                                    onChange={(e) => setHipHike(e.target.checked)}
                                  />
                                  <span className="text-sm">Hip Hike</span>
                                </label>
                                <label className="flex items-center">
                                  <input 
                                    type="checkbox" 
                                    className="mr-2" 
                                    checked={trunkLean}
                                    onChange={(e) => setTrunkLean(e.target.checked)}
                                  />
                                  <span className="text-sm">Trunk Lean</span>
                                </label>
                                <label className="flex items-center">
                                  <input 
                                    type="checkbox" 
                                    className="mr-2" 
                                    checked={circumduction}
                                    onChange={(e) => setCircumduction(e.target.checked)}
                                  />
                                  <span className="text-sm">Circumduction</span>
                                </label>
                                <label className="flex items-center">
                                  <input 
                                    type="checkbox" 
                                    className="mr-2" 
                                    checked={trendelenburg}
                                    onChange={(e) => setTrendelenburg(e.target.checked)}
                                  />
                                  <span className="text-sm">Trendelenburg</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium mb-2">
                          {selectedTest ? "Test Instructions:" : "Exercise Instructions:"}
                        </h4>
                        <p className="text-sm text-gray-700">
                          {selectedTest?.includes("Shoulder Abduction") && 
                            "Patient starts with arms at sides, then abducts both arms to 180 degrees overhead. Assess for range of motion, symmetry, and compensation patterns."}
                          {selectedTest?.includes("Shoulder Flexion") && 
                            "Patient raises arms forward and up to full overhead position. Look for scapular rhythm and any trunk compensation."}
                          {selectedTest?.includes("Knee Flexion") && 
                            "Patient flexes knee to maximum range. Normal range is 130-140 degrees. Check for crepitus or pain."}
                          {selectedTest?.includes("Hip Abduction") && 
                            "Patient moves leg laterally away from midline. Normal range is 40-45 degrees. Watch for trunk lean."}
                          {selectedTest?.includes("Standing March") && 
                            "Patient alternates lifting knees to 90 degrees. Assess balance, coordination, and hip flexor strength."}
                          {selectedExercise?.includes("Squat") && 
                            "Keep feet shoulder-width apart, lower hips back and down, maintain neutral spine. Go as low as comfortable while keeping knees aligned over toes."}
                          {selectedExercise?.includes("Deadlift") && 
                            "Hinge at hips, maintain neutral spine, keep weight close to body. Drive through heels to return to standing."}
                          {selectedExercise?.includes("Bridge") && 
                            "Lie on back, feet flat on floor. Lift hips up squeezing glutes, hold briefly, lower with control."}
                          {selectedExercise?.includes("Step-Up") && 
                            "Step up onto platform with full foot, drive through heel, control descent. Keep torso upright throughout."}
                          {selectedExercise?.includes("Bird Dog") && 
                            "Start on hands and knees. Extend opposite arm and leg, maintain neutral spine, hold briefly."}
                          {selectedExercise?.includes("Shoulder Press") && 
                            "Press weights overhead maintaining neutral spine. Lower with control to shoulder level."}
                          {selectedExercise?.includes("Plank") && 
                            "Maintain straight line from head to heels. Engage core, avoid sagging hips or raised buttocks."}
                          {selectedExercise?.includes("Lunge") && 
                            "Step forward, lower back knee toward floor. Keep front knee over ankle, push through front heel to return."}
                          {!selectedTest && !selectedExercise && 
                            "Select a test or exercise to see specific instructions."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-16">
                      <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg">Select an assessment test or exercise</p>
                      <p className="text-sm mt-2">Choose from the left panel to see the 3D demonstration</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}