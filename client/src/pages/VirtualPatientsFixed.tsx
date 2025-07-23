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
    { id: 10, name: "Standing March Test", text: "Standing march test - alternating knee lifts", bodyPart: "general" }
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
                          limbScales={{
                            upperArm: 1.0,
                            forearm: 1.0,
                            thigh: 1.0,
                            shin: 1.0,
                            torso: 1.0,
                            overall: 1.0
                          }}
                        />
                      </div>
                      
                      {/* Control Sliders */}
                      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
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