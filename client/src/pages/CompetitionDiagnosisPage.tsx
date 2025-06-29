import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ArrowLeft, Clock, Target, Brain, CheckCircle } from 'lucide-react';

interface DiagnosisAttempt {
  caseStudyId: number;
  userDiagnosis: string;
  userReasoning: string;
  assessmentTests: string[];
  proposedTreatment: string;
  timeSpent: number;
}

interface CaseStudy {
  id: number;
  title: string;
  patientDescription: string;
  history?: string;
  presentingSymptoms: string;
  vitalSigns?: string;
  bodyPart: string;
  complexity: string;
  hiddenFindings?: any;
}

interface Competition {
  id: number;
  title: string;
  description: string;
  status: string;
}

export default function CompetitionDiagnosisPage() {
  const { competitionId, caseId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Timer state
  const [startTime] = useState(Date.now());
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  // Form state
  const [diagnosis, setDiagnosis] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [treatment, setTreatment] = useState('');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  
  // Available assessment tests
  const assessmentTests = [
    'Range of Motion Tests',
    'Manual Muscle Testing',
    'Special Tests',
    'Palpation',
    'Neurological Assessment',
    'Functional Movement Screen',
    'Pain Assessment',
    'Joint Mobility Tests',
    'Postural Assessment',
    'Gait Analysis'
  ];

  // Update timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Get case study details
  const { data: caseStudy, isLoading: loadingCase } = useQuery<CaseStudy>({
    queryKey: [`/api/competitions/${competitionId}/cases/${caseId}`],
    enabled: !!competitionId && !!caseId,
  });

  // Get competition details
  const { data: competition, isLoading: loadingCompetition } = useQuery<Competition>({
    queryKey: [`/api/competitions/${competitionId}`],
    enabled: !!competitionId,
  });

  // Submit diagnosis mutation
  const submitDiagnosis = useMutation({
    mutationFn: async (attempt: DiagnosisAttempt) => {
      const response = await apiRequest('POST', `/api/competitions/${competitionId}/submit-diagnosis`, {
        attempt
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Diagnosis Submitted!",
        description: "Your clinical reasoning has been evaluated.",
      });
      
      // Navigate back to competition page with results
      setLocation(`/competitions/${competitionId}?submitted=true`);
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTestToggle = (test: string) => {
    setSelectedTests(prev => 
      prev.includes(test) 
        ? prev.filter(t => t !== test)
        : [...prev, test]
    );
  };

  const handleSubmit = () => {
    if (!diagnosis.trim() || !reasoning.trim() || !treatment.trim()) {
      toast({
        title: "Incomplete Form",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const timeSpent = Math.floor((currentTime - startTime) / 1000);
    
    const attempt: DiagnosisAttempt = {
      caseStudyId: parseInt(caseId!),
      userDiagnosis: diagnosis,
      userReasoning: reasoning,
      assessmentTests: selectedTests,
      proposedTreatment: treatment,
      timeSpent
    };

    submitDiagnosis.mutate(attempt);
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loadingCase || loadingCompetition) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!caseStudy || !competition) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <h3 className="text-lg font-semibold mb-2">Case Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The requested case study could not be found.
            </p>
            <Button onClick={() => setLocation(`/competitions/${competitionId}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Competition
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/competitions/${competitionId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{competition.title}</h1>
            <p className="text-muted-foreground">Clinical Diagnosis Challenge</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            {formatTime(currentTime - startTime)}
          </div>
          <Badge variant="outline">
            {caseStudy.bodyPart}
          </Badge>
          <Badge variant={caseStudy.complexity === 'beginner' ? 'secondary' : 
                        caseStudy.complexity === 'intermediate' ? 'default' : 'destructive'}>
            {caseStudy.complexity}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Case Study Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              {caseStudy.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Patient Description:</h4>
              <p className="text-sm">{caseStudy.patientDescription}</p>
            </div>
            
            {caseStudy.history && (
              <div>
                <h4 className="font-semibold mb-2">History:</h4>
                <p className="text-sm">{caseStudy.history}</p>
              </div>
            )}
            
            <div>
              <h4 className="font-semibold mb-2">Presenting Symptoms:</h4>
              <p className="text-sm">{caseStudy.presentingSymptoms}</p>
            </div>

            {caseStudy.vitalSigns && (
              <div>
                <h4 className="font-semibold mb-2">Vital Signs:</h4>
                <p className="text-sm">{caseStudy.vitalSigns}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diagnosis Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Your Clinical Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Primary Diagnosis */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Primary Diagnosis <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Enter your primary diagnosis..."
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>

            {/* Clinical Reasoning */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Clinical Reasoning <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Explain your clinical reasoning, including key findings that support your diagnosis..."
                rows={4}
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
              />
            </div>

            {/* Assessment Tests */}
            <div>
              <label className="text-sm font-medium mb-3 block">
                Assessment Tests Used
              </label>
              <div className="grid grid-cols-2 gap-3">
                {assessmentTests.map((test) => (
                  <div key={test} className="flex items-center space-x-2">
                    <Checkbox
                      id={test}
                      checked={selectedTests.includes(test)}
                      onCheckedChange={() => handleTestToggle(test)}
                    />
                    <label htmlFor={test} className="text-sm">
                      {test}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Treatment Plan */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Proposed Treatment Plan <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Describe your proposed treatment approach, including interventions, exercises, and patient education..."
                rows={4}
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                onClick={handleSubmit}
                disabled={submitDiagnosis.isPending}
                size="lg"
                className="w-full"
              >
                {submitDiagnosis.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Diagnosis
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}