import { useQuery } from "@tanstack/react-query";
import { Loader2, Users } from "lucide-react";

export default function VirtualPatientsSimple() {
  console.log('=== VIRTUAL PATIENTS SIMPLE COMPONENT RENDERING ===');
  
  // Get all virtual patients for user
  const { data: virtualPatients = [], isLoading: patientsLoading, error } = useQuery({
    queryKey: ["/api/virtual-patients"],
  });

  console.log('Virtual Patients Query State:', {
    data: virtualPatients,
    isLoading: patientsLoading,
    error: error,
    isArray: Array.isArray(virtualPatients)
  });

  if (patientsLoading) {
    console.log('Rendering loading state');
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
    console.log('Rendering error state');
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-red-600">Error loading virtual patients: {error.toString()}</p>
          </div>
        </div>
      </div>
    );
  }

  console.log('Rendering main component');
  const patientsArray = Array.isArray(virtualPatients) ? virtualPatients : [];
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            Virtual Patients (Simple)
          </h1>
          <p className="text-gray-600 mt-2">
            Debug version to test basic functionality
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Loading:</strong> {patientsLoading ? 'Yes' : 'No'}</p>
            <p><strong>Error:</strong> {error ? error.toString() : 'None'}</p>
            <p><strong>Data Type:</strong> {typeof virtualPatients}</p>
            <p><strong>Is Array:</strong> {Array.isArray(virtualPatients) ? 'Yes' : 'No'}</p>
            <p><strong>Patients Count:</strong> {patientsArray.length}</p>
            <div className="mt-4">
              <strong>Raw Data:</strong>
              <pre className="bg-gray-100 p-2 rounded mt-2 text-xs overflow-auto max-h-40">
                {JSON.stringify(virtualPatients, null, 2)}
              </pre>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Patient List</h3>
            {patientsArray.length > 0 ? (
              <ul className="space-y-2">
                {patientsArray.map((patient: any, index: number) => (
                  <li key={patient.id || index} className="p-2 border rounded">
                    <strong>ID:</strong> {patient.id || 'No ID'} - 
                    <strong> Title:</strong> {patient.title || 'No Title'} -
                    <strong> Body Part:</strong> {patient.bodyPart || 'No Body Part'}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No patients found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}