import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  AlertTriangle, AlertCircle, Info, ChevronDown, ChevronRight,
  Activity, BookOpen, Stethoscope, TestTube, FileText,
  ShieldAlert, Brain, Book, TrendingUp, CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RedFlagAlert {
  level: 'critical' | 'urgent' | 'important';
  condition: string;
  matchedText: string;
  recommendations: string[];
}

interface DifferentialDiagnosis {
  diagnosis: string;
  probability: number;
  supportingSymptoms: string[];
  additionalTestsNeeded: string[];
  icd10Code?: string;
}

interface ClinicalGuideline {
  condition: string;
  source: string;
  year: number;
  recommendations: string[];
  redFlags?: string[];
  specialTests?: string[];
  imaging?: string[];
}

interface ClinicalDecisionSupportProps {
  transcript: string;
  soapSections: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  isRecording: boolean;
}

export function ClinicalDecisionSupport({ 
  transcript, 
  soapSections, 
  isRecording 
}: ClinicalDecisionSupportProps) {
  const [redFlags, setRedFlags] = useState<RedFlagAlert[]>([]);
  const [differentials, setDifferentials] = useState<DifferentialDiagnosis[]>([]);
  const [guidelines, setGuidelines] = useState<ClinicalGuideline[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedDifferential, setExpandedDifferential] = useState<string | null>(null);
  const [expandedGuideline, setExpandedGuideline] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('alerts');
  const { toast } = useToast();

  // Analyze transcript for red flags in real-time
  useEffect(() => {
    if (!transcript || transcript.length < 50) return;

    const analyzeRedFlags = async () => {
      try {
        const response = await fetch('/api/clinical-decision/red-flags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript })
        });

        if (response.ok) {
          const data = await response.json();
          const newRedFlags = data.alerts || [];
          
          // Only show toast for new critical alerts
          const newCriticalAlerts = newRedFlags.filter(
            (alert: RedFlagAlert) => 
              alert.level === 'critical' && 
              !redFlags.find(existing => existing.condition === alert.condition)
          );
          
          if (newCriticalAlerts.length > 0) {
            toast({
              title: "⚠️ Critical Red Flag Detected",
              description: newCriticalAlerts[0].condition,
              variant: "destructive",
              duration: 10000
            });
          }
          
          setRedFlags(newRedFlags);
        }
      } catch (error) {
        console.error('Error analyzing red flags:', error);
      }
    };

    const debounceTimer = setTimeout(analyzeRedFlags, 2000);
    return () => clearTimeout(debounceTimer);
  }, [transcript]);

  // Generate differential diagnoses when SOAP sections are complete
  useEffect(() => {
    if (!soapSections.subjective || !soapSections.objective) return;

    const generateDifferentials = async () => {
      setIsAnalyzing(true);
      try {
        const response = await fetch('/api/clinical-decision/differentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript, soapSections })
        });

        if (response.ok) {
          const data = await response.json();
          setDifferentials(data.differentials || []);
        }
      } catch (error) {
        console.error('Error generating differentials:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    const debounceTimer = setTimeout(generateDifferentials, 5000);
    return () => clearTimeout(debounceTimer);
  }, [soapSections.subjective, soapSections.objective]);

  // Match clinical guidelines based on assessment
  useEffect(() => {
    if (!soapSections.assessment && !transcript) return;

    const matchGuidelines = async () => {
      try {
        const response = await fetch('/api/clinical-decision/guidelines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            transcript, 
            assessment: soapSections.assessment 
          })
        });

        if (response.ok) {
          const data = await response.json();
          setGuidelines(data.guidelines || []);
        }
      } catch (error) {
        console.error('Error matching guidelines:', error);
      }
    };

    const debounceTimer = setTimeout(matchGuidelines, 3000);
    return () => clearTimeout(debounceTimer);
  }, [transcript, soapSections.assessment]);

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'urgent':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'important':
        return <Info className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getAlertVariant = (level: string): "default" | "destructive" => {
    return level === 'critical' ? 'destructive' : 'default';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Clinical Decision Support
          {isRecording && (
            <Badge variant="secondary" className="ml-2">
              <span className="animate-pulse mr-1">●</span> Live Analysis
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="alerts" className="flex items-center gap-1">
              <ShieldAlert className="w-4 h-4" />
              Red Flags
              {redFlags.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1">
                  {redFlags.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="diagnosis" className="flex items-center gap-1">
              <Stethoscope className="w-4 h-4" />
              Differentials
            </TabsTrigger>
            <TabsTrigger value="guidelines" className="flex items-center gap-1">
              <Book className="w-4 h-4" />
              Guidelines
            </TabsTrigger>
          </TabsList>

          {/* Red Flag Alerts Tab */}
          <TabsContent value="alerts" className="mt-4">
            <ScrollArea className="h-[400px]">
              {redFlags.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No red flags detected</p>
                  <p className="text-xs mt-1">System monitoring for critical symptoms...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {redFlags.map((alert, index) => (
                    <Alert 
                      key={index} 
                      variant={getAlertVariant(alert.level)}
                      className={`${
                        alert.level === 'critical' ? 'border-red-500 bg-red-50' :
                        alert.level === 'urgent' ? 'border-orange-500 bg-orange-50' :
                        'border-yellow-500 bg-yellow-50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {getAlertIcon(alert.level)}
                        <div className="flex-1">
                          <AlertTitle className="text-sm font-semibold">
                            {alert.condition}
                          </AlertTitle>
                          <AlertDescription className="mt-2">
                            <p className="text-xs mb-2 italic">
                              Detected: "{alert.matchedText}"
                            </p>
                            <div className="space-y-1">
                              {alert.recommendations.map((rec, idx) => (
                                <div key={idx} className="flex items-start gap-1">
                                  <CheckCircle className="w-3 h-3 mt-0.5 text-green-600" />
                                  <span className="text-xs">{rec}</span>
                                </div>
                              ))}
                            </div>
                          </AlertDescription>
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Differential Diagnosis Tab */}
          <TabsContent value="diagnosis" className="mt-4">
            <ScrollArea className="h-[400px]">
              {isAnalyzing ? (
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 mx-auto mb-3 animate-pulse" />
                  <p className="text-sm text-muted-foreground">Analyzing symptoms...</p>
                </div>
              ) : differentials.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No differentials generated yet</p>
                  <p className="text-xs mt-1">Complete subjective and objective sections</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {differentials.map((dx, index) => (
                    <Collapsible 
                      key={index}
                      open={expandedDifferential === dx.diagnosis}
                      onOpenChange={(open) => 
                        setExpandedDifferential(open ? dx.diagnosis : null)
                      }
                    >
                      <div className="border rounded-lg p-3">
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-muted-foreground">
                                #{index + 1}
                              </span>
                              <div className="text-left">
                                <p className="font-medium">{dx.diagnosis}</p>
                                {dx.icd10Code && (
                                  <Badge variant="outline" className="text-xs mt-1">
                                    ICD-10: {dx.icd10Code}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <Progress 
                                  value={dx.probability} 
                                  className="w-20 h-2"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  {dx.probability}% probability
                                </p>
                              </div>
                              {expandedDifferential === dx.diagnosis ? 
                                <ChevronDown className="w-4 h-4" /> : 
                                <ChevronRight className="w-4 h-4" />
                              }
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-3 pt-3 border-t">
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-medium mb-1 flex items-center gap-1">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                Supporting Symptoms
                              </p>
                              <div className="ml-5 space-y-1">
                                {dx.supportingSymptoms.map((symptom, idx) => (
                                  <p key={idx} className="text-xs text-muted-foreground">
                                    • {symptom}
                                  </p>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium mb-1 flex items-center gap-1">
                                <TestTube className="w-4 h-4 text-blue-500" />
                                Recommended Tests
                              </p>
                              <div className="ml-5 space-y-1">
                                {dx.additionalTestsNeeded.map((test, idx) => (
                                  <p key={idx} className="text-xs text-muted-foreground">
                                    • {test}
                                  </p>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Clinical Guidelines Tab */}
          <TabsContent value="guidelines" className="mt-4">
            <ScrollArea className="h-[400px]">
              {guidelines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No matching guidelines found</p>
                  <p className="text-xs mt-1">Guidelines appear based on conditions mentioned</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {guidelines.map((guideline, index) => (
                    <Collapsible
                      key={index}
                      open={expandedGuideline === guideline.condition}
                      onOpenChange={(open) => 
                        setExpandedGuideline(open ? guideline.condition : null)
                      }
                    >
                      <div className="border rounded-lg p-3">
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center justify-between">
                            <div className="text-left">
                              <p className="font-medium capitalize">
                                {guideline.condition}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {guideline.source} ({guideline.year})
                              </p>
                            </div>
                            {expandedGuideline === guideline.condition ? 
                              <ChevronDown className="w-4 h-4" /> : 
                              <ChevronRight className="w-4 h-4" />
                            }
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-3 pt-3 border-t">
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-medium mb-2 flex items-center gap-1">
                                <FileText className="w-4 h-4 text-blue-500" />
                                Recommendations
                              </p>
                              <div className="ml-5 space-y-1">
                                {guideline.recommendations.map((rec, idx) => (
                                  <p key={idx} className="text-xs text-muted-foreground">
                                    {idx + 1}. {rec}
                                  </p>
                                ))}
                              </div>
                            </div>
                            
                            {guideline.redFlags && (
                              <div>
                                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                                  <AlertTriangle className="w-4 h-4 text-red-500" />
                                  Red Flags to Monitor
                                </p>
                                <div className="ml-5 space-y-1">
                                  {guideline.redFlags.map((flag, idx) => (
                                    <p key={idx} className="text-xs text-muted-foreground">
                                      • {flag}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {guideline.specialTests && (
                              <div>
                                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                                  <Activity className="w-4 h-4 text-green-500" />
                                  Special Tests
                                </p>
                                <div className="ml-5 space-y-1">
                                  {guideline.specialTests.map((test, idx) => (
                                    <p key={idx} className="text-xs text-muted-foreground">
                                      • {test}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {guideline.imaging && (
                              <div>
                                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                                  <TrendingUp className="w-4 h-4 text-purple-500" />
                                  Imaging Recommendations
                                </p>
                                <div className="ml-5 space-y-1">
                                  {guideline.imaging.map((img, idx) => (
                                    <p key={idx} className="text-xs text-muted-foreground">
                                      • {img}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}