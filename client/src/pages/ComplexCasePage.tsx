import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, User, Stethoscope, Brain, ArrowLeft, AlertCircle, XCircle } from 'lucide-react';

interface ComplexCase {
  id: number;
  title: string;
  patientDescription: string;
  occupationalHistory?: string;
  socialHistory?: string;
  medicalHistory: string;
  currentMedications?: string;
  mechanismOfInjury?: string;
  bodyPart: string;
  complexity: string;
  estimatedTime: number;
  initialPresentation?: {
    chiefComplaint: string;
    painScale: number;
    functionalLimitations: string[];
    patientGoals: string[];
  };
  detailedHistory?: {
    onsetDetails: string;
    progressionPattern: string;
    aggravatingFactors: string[];
    easingFactors: string[];
    previousTreatments: string[];
    redFlagScreening: string[];
  };
  physicalFindings?: {
    observation: string;
    palpation: string;
    rangeOfMotion: string;
    strength: string;
    neurological: string;
  };
}

export default function ComplexCasePage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  // Get case data
  const { data: complexCase, isLoading: loadingCase, error } = useQuery<ComplexCase>({
    queryKey: [`/api/complex-cases/${id}`],
    enabled: !!id
  });

  if (loadingCase) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-300 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !complexCase) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Case Not Found</h2>
            <p className="text-gray-600 mb-4">The requested complex case could not be found.</p>
            <Button onClick={() => setLocation('/competitions')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Competitions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{complexCase.title}</CardTitle>
              <CardDescription className="flex items-center gap-4 mt-3">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Stethoscope className="h-3 w-3" />
                  {complexCase.bodyPart}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Brain className="h-3 w-3" />
                  {complexCase.complexity}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {complexCase.estimatedTime} min
                </Badge>
              </CardDescription>
            </div>
            <Button onClick={() => setLocation('/competitions')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Competitions
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Case Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Patient Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{complexCase.patientDescription}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medical History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{complexCase.medicalHistory}</p>
          </CardContent>
        </Card>
      </div>

      {/* Initial Presentation */}
      {complexCase.initialPresentation && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Initial Presentation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Chief Complaint</h4>
              <p className="text-gray-700">{complexCase.initialPresentation.chiefComplaint}</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Pain Scale</h4>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-red-600">
                  {complexCase.initialPresentation.painScale}/10
                </span>
                <span className="text-gray-600">Pain intensity</span>
              </div>
            </div>

            {complexCase.initialPresentation.functionalLimitations?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Functional Limitations</h4>
                <ul className="list-disc list-inside space-y-1">
                  {complexCase.initialPresentation.functionalLimitations.map((limitation, index) => (
                    <li key={index} className="text-gray-700">{limitation}</li>
                  ))}
                </ul>
              </div>
            )}

            {complexCase.initialPresentation.patientGoals?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Patient Goals</h4>
                <ul className="list-disc list-inside space-y-1">
                  {complexCase.initialPresentation.patientGoals.map((goal, index) => (
                    <li key={index} className="text-gray-700">{goal}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Additional Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {complexCase.occupationalHistory && (
          <Card>
            <CardHeader>
              <CardTitle>Occupational History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{complexCase.occupationalHistory}</p>
            </CardContent>
          </Card>
        )}

        {complexCase.socialHistory && (
          <Card>
            <CardHeader>
              <CardTitle>Social History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{complexCase.socialHistory}</p>
            </CardContent>
          </Card>
        )}

        {complexCase.currentMedications && (
          <Card>
            <CardHeader>
              <CardTitle>Current Medications</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{complexCase.currentMedications}</p>
            </CardContent>
          </Card>
        )}

        {complexCase.mechanismOfInjury && (
          <Card>
            <CardHeader>
              <CardTitle>Mechanism of Injury</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{complexCase.mechanismOfInjury}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed History */}
      {complexCase.detailedHistory && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Detailed History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Onset Details</h4>
              <p className="text-gray-700">{complexCase.detailedHistory.onsetDetails}</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Progression Pattern</h4>
              <p className="text-gray-700">{complexCase.detailedHistory.progressionPattern}</p>
            </div>

            {complexCase.detailedHistory.aggravatingFactors?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Aggravating Factors</h4>
                <ul className="list-disc list-inside space-y-1">
                  {complexCase.detailedHistory.aggravatingFactors.map((factor, index) => (
                    <li key={index} className="text-gray-700">{factor}</li>
                  ))}
                </ul>
              </div>
            )}

            {complexCase.detailedHistory.easingFactors?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Easing Factors</h4>
                <ul className="list-disc list-inside space-y-1">
                  {complexCase.detailedHistory.easingFactors.map((factor, index) => (
                    <li key={index} className="text-gray-700">{factor}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Physical Findings */}
      {complexCase.physicalFindings && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Physical Examination Findings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Observation</h4>
              <p className="text-gray-700">{complexCase.physicalFindings.observation}</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Palpation</h4>
              <p className="text-gray-700">{complexCase.physicalFindings.palpation}</p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Range of Motion</h4>
              <p className="text-gray-700">{complexCase.physicalFindings.rangeOfMotion}</p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Strength Assessment</h4>
              <p className="text-gray-700">{complexCase.physicalFindings.strength}</p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Neurological Assessment</h4>
              <p className="text-gray-700">{complexCase.physicalFindings.neurological}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notice about upcoming functionality */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-amber-700">
            <AlertCircle className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">Complex Case Study Interface</h3>
              <p className="text-sm text-amber-600 mt-1">
                This is a detailed case presentation. Interactive multi-stage assessment functionality will be available soon.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}