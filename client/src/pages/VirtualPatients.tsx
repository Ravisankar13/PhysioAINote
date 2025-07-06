import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Calendar, Activity, Heart, Brain, FileText, Users } from "lucide-react";
import type { SoapVirtualPatient } from "@shared/schema";

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

function VirtualPatientCard({ patient }: { patient: SoapVirtualPatient }) {
  // Add null checks to prevent undefined errors
  if (!patient) return null;
  
  const profile = patient.patientProfile || {};
  const presentation = patient.clinicalPresentation || {};
  const findings = patient.physicalFindings || {};
  const communication = patient.communicationStyle || {};

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            {profile.name || 'Unknown Patient'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {patient.bodyPart || 'general'}
            </Badge>
            <Badge 
              variant={patient.complexity === 'high' ? 'destructive' : 
                      patient.complexity === 'medium' ? 'secondary' : 'default'}
            >
              {patient.complexity || 'medium'} complexity
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {profile.age || 'N/A'} years old
          </span>
          <span>{profile.gender || 'N/A'}</span>
          <span>{profile.occupation || 'N/A'}</span>
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

        {/* Pain Scale */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Pain Level:</span>
          <div className="flex items-center gap-1">
            <span className="text-lg font-bold text-red-600">{presentation.painScale || 0}</span>
            <span className="text-sm text-gray-500">/10</span>
          </div>
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

        {/* Metadata */}
        <div className="pt-2 border-t text-xs text-gray-500 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            SOAP Note #{patient.soapNoteId}
          </span>
          <span>Est. Duration: {patient.estimatedDuration}</span>
        </div>
      </CardContent>
    </Card>
  );
}