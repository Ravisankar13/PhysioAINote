import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Users, Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SoapVirtualPatient } from "@shared/schema";

export default function VirtualPatientsFixed() {
  const [selectedPatient, setSelectedPatient] = useState<SoapVirtualPatient | null>(null);

  // Get all virtual patients for user
  const { data: virtualPatients = [], isLoading: patientsLoading, error } = useQuery({
    queryKey: ["/api/virtual-patients"],
  });

  const patientsArray = Array.isArray(virtualPatients) ? virtualPatients : [];

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
                Virtual Patients (Fixed)
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

        {/* Main Content */}
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

        {/* Debug Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Loading:</strong> {patientsLoading ? 'Yes' : 'No'}</p>
                <p><strong>Error:</strong> {error ? 'Yes' : 'No'}</p>
                <p><strong>Data Type:</strong> {typeof virtualPatients}</p>
              </div>
              <div>
                <p><strong>Is Array:</strong> {Array.isArray(virtualPatients) ? 'Yes' : 'No'}</p>
                <p><strong>Patient Count:</strong> {patientsArray.length}</p>
                <p><strong>Selected Patient:</strong> {selectedPatient ? selectedPatient.id : 'None'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}