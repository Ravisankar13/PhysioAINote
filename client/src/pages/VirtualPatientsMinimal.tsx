import { useQuery } from "@tanstack/react-query";
import { Loader2, Users, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VirtualPatientsMinimal() {
  // Get all virtual patients for user
  const { data: virtualPatients = [], isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/virtual-patients"],
  });

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

  const patientsArray = Array.isArray(virtualPatients) ? virtualPatients : [];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-600" />
                Virtual Patients (Minimal)
              </h1>
              <p className="text-gray-600 mt-2">
                Minimal version to test basic functionality
              </p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Camera className="h-4 w-4 mr-2" />
              Motion Capture
            </Button>
          </div>
        </div>

        {/* Simple Patient List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient List ({patientsArray.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {patientsArray.length > 0 ? (
                <div className="space-y-2">
                  {patientsArray.map((patient: any) => (
                    <div key={patient.id} className="p-3 border rounded-lg">
                      <div className="font-medium">{patient.title}</div>
                      <div className="text-sm text-gray-500">
                        Body Part: {patient.bodyPart || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        Has Motion Data: {patient.motionData ? 'Yes' : 'No'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No virtual patients found
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div><strong>Loading:</strong> {patientsLoading ? 'Yes' : 'No'}</div>
                <div><strong>Data Type:</strong> {typeof virtualPatients}</div>
                <div><strong>Is Array:</strong> {Array.isArray(virtualPatients) ? 'Yes' : 'No'}</div>
                <div><strong>Count:</strong> {patientsArray.length}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Text to Animation Test */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Text to Animation Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Describe movement (e.g., limited shoulder movement)" 
                className="w-full p-2 border rounded"
              />
              <Button>Generate Animation</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}