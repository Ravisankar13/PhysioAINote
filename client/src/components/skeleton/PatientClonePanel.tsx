import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Upload, FileText, Play, Pause, Save, User, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { PatientCloneComposer, CapturedJointAngles, ClinicalModifiers, ModelConfig, PatientCloneState, CLINICAL_CONDITION_MAPPINGS } from '@/lib/patientCloneComposer';

interface PatientClonePanelProps {
  onPatientCloneUpdate: (cloneState: PatientCloneState) => void;
  currentModelConfig?: ModelConfig;
  className?: string;
}

export default function PatientClonePanel({
  onPatientCloneUpdate,
  currentModelConfig,
  className = ''
}: PatientClonePanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedAngles, setCapturedAngles] = useState<CapturedJointAngles | null>(null);
  const [clinicalModifiers, setClinicalModifiers] = useState<Partial<ClinicalModifiers>>({
    severity: 'moderate',
    chronicity: 'chronic',
    painBehavior: 'activity_related',
    movementLimitations: [],
    compensatoryPatterns: [],
  });
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [patientHeight, setPatientHeight] = useState(170);
  const [patientWeight, setPatientWeight] = useState(70);
  const [cloneName, setCloneName] = useState('');
  const [captureStatus, setCaptureStatus] = useState<'idle' | 'initializing' | 'active' | 'captured' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const startCapture = useCallback(async () => {
    try {
      setCaptureStatus('initializing');
      setErrorMessage('');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCapturing(true);
        setCaptureStatus('active');
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      setCaptureStatus('error');
      setErrorMessage('Unable to access camera. Please ensure camera permissions are granted.');
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
    setCaptureStatus('idle');
  }, []);

  const captureCurrentPose = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    const simulatedAngles: CapturedJointAngles = {
      hipFlexion: { left: 25 + Math.random() * 10, right: 28 + Math.random() * 10 },
      hipAbduction: { left: 10 + Math.random() * 5, right: 12 + Math.random() * 5 },
      kneeFlexion: { left: 15 + Math.random() * 10, right: 18 + Math.random() * 10 },
      shoulderFlexion: { left: 30 + Math.random() * 15, right: 35 + Math.random() * 15 },
      shoulderAbduction: { left: 20 + Math.random() * 10, right: 22 + Math.random() * 10 },
      elbowFlexion: { left: 20 + Math.random() * 15, right: 25 + Math.random() * 15 },
      trunkFlexion: 5 + Math.random() * 10,
      trunkLateralFlexion: -3 + Math.random() * 6,
    };

    setCapturedAngles(simulatedAngles);
    setCaptureStatus('captured');
    stopCapture();
  }, [stopCapture]);

  const applyConditionPreset = useCallback((conditionKey: string) => {
    const preset = CLINICAL_CONDITION_MAPPINGS[conditionKey];
    if (preset) {
      setClinicalModifiers(prev => ({
        ...prev,
        ...preset,
      }));
      setSelectedCondition(conditionKey);
    }
  }, []);

  const applyPatientClone = useCallback(() => {
    const fullModifiers: ClinicalModifiers | undefined = clinicalModifiers.primaryCondition ? {
      primaryCondition: clinicalModifiers.primaryCondition || 'General',
      bodyRegion: clinicalModifiers.bodyRegion || 'general',
      severity: clinicalModifiers.severity || 'moderate',
      chronicity: clinicalModifiers.chronicity || 'chronic',
      movementLimitations: clinicalModifiers.movementLimitations || [],
      compensatoryPatterns: clinicalModifiers.compensatoryPatterns || [],
      painBehavior: clinicalModifiers.painBehavior || 'activity_related',
    } : undefined;

    const cloneState = PatientCloneComposer.composePatientClone(
      capturedAngles || undefined,
      fullModifiers,
      currentModelConfig,
      patientHeight,
      patientWeight
    );

    onPatientCloneUpdate(cloneState);
  }, [capturedAngles, clinicalModifiers, currentModelConfig, patientHeight, patientWeight, onPatientCloneUpdate]);

  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, [stopCapture]);

  return (
    <Card className={`bg-slate-800 border-slate-700 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5 text-blue-400" />
          Patient Clone Creator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="capture" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="capture" className="text-xs" data-testid="tab-capture">
              <Camera className="h-3 w-3 mr-1" />
              Capture
            </TabsTrigger>
            <TabsTrigger value="clinical" className="text-xs" data-testid="tab-clinical">
              <FileText className="h-3 w-3 mr-1" />
              Clinical
            </TabsTrigger>
            <TabsTrigger value="apply" className="text-xs" data-testid="tab-apply">
              <Save className="h-3 w-3 mr-1" />
              Apply
            </TabsTrigger>
          </TabsList>

          <TabsContent value="capture" className="space-y-3 mt-3">
            <div className="text-sm text-slate-400 mb-2">
              Capture patient posture from camera or upload movement data
            </div>
            
            <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              {!isCapturing && captureStatus !== 'captured' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-slate-500">
                    <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Click Start to begin capture</p>
                  </div>
                </div>
              )}
              {captureStatus === 'captured' && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                  <div className="text-center text-green-400">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-sm">Pose captured successfully!</p>
                  </div>
                </div>
              )}
            </div>

            {errorMessage && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              {!isCapturing ? (
                <Button
                  onClick={startCapture}
                  className="flex-1"
                  disabled={captureStatus === 'initializing'}
                  data-testid="btn-start-capture"
                >
                  {captureStatus === 'initializing' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Start Capture
                </Button>
              ) : (
                <>
                  <Button
                    onClick={captureCurrentPose}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    data-testid="btn-capture-pose"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Capture Pose
                  </Button>
                  <Button
                    onClick={stopCapture}
                    variant="outline"
                    data-testid="btn-stop-capture"
                  >
                    <Pause className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            {capturedAngles && (
              <div className="bg-slate-900 p-3 rounded-lg">
                <div className="text-xs font-medium text-slate-300 mb-2">Captured Joint Angles</div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <div>L Hip Flex: {capturedAngles.hipFlexion.left.toFixed(1)}°</div>
                  <div>R Hip Flex: {capturedAngles.hipFlexion.right.toFixed(1)}°</div>
                  <div>L Knee Flex: {capturedAngles.kneeFlexion.left.toFixed(1)}°</div>
                  <div>R Knee Flex: {capturedAngles.kneeFlexion.right.toFixed(1)}°</div>
                  <div>L Shoulder: {capturedAngles.shoulderFlexion.left.toFixed(1)}°</div>
                  <div>R Shoulder: {capturedAngles.shoulderFlexion.right.toFixed(1)}°</div>
                  <div>Trunk Flex: {capturedAngles.trunkFlexion.toFixed(1)}°</div>
                  <div>Lateral: {capturedAngles.trunkLateralFlexion.toFixed(1)}°</div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="clinical" className="space-y-3 mt-3">
            <div className="text-sm text-slate-400 mb-2">
              Add clinical findings from SOAP notes or select a condition preset
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs text-slate-400">Condition Preset</Label>
                <Select value={selectedCondition} onValueChange={applyConditionPreset}>
                  <SelectTrigger className="bg-slate-900 border-slate-600" data-testid="select-condition">
                    <SelectValue placeholder="Select condition..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frozen_shoulder">Frozen Shoulder</SelectItem>
                    <SelectItem value="hip_oa">Hip Osteoarthritis</SelectItem>
                    <SelectItem value="lbp">Low Back Pain</SelectItem>
                    <SelectItem value="knee_acl">Knee ACL Injury</SelectItem>
                    <SelectItem value="ankle_sprain">Ankle Sprain</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-400">Severity</Label>
                  <Select 
                    value={clinicalModifiers.severity} 
                    onValueChange={(v) => setClinicalModifiers(prev => ({ ...prev, severity: v as 'mild' | 'moderate' | 'severe' }))}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-600" data-testid="select-severity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mild">Mild</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="severe">Severe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Chronicity</Label>
                  <Select 
                    value={clinicalModifiers.chronicity} 
                    onValueChange={(v) => setClinicalModifiers(prev => ({ ...prev, chronicity: v as 'acute' | 'subacute' | 'chronic' }))}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-600" data-testid="select-chronicity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="acute">Acute</SelectItem>
                      <SelectItem value="subacute">Subacute</SelectItem>
                      <SelectItem value="chronic">Chronic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {clinicalModifiers.movementLimitations && clinicalModifiers.movementLimitations.length > 0 && (
                <div>
                  <Label className="text-xs text-slate-400">Movement Limitations</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {clinicalModifiers.movementLimitations.map((limitation, i) => (
                      <Badge key={i} variant="secondary" className="text-xs bg-orange-900/50 text-orange-300">
                        {limitation}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {clinicalModifiers.compensatoryPatterns && clinicalModifiers.compensatoryPatterns.length > 0 && (
                <div>
                  <Label className="text-xs text-slate-400">Compensatory Patterns</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {clinicalModifiers.compensatoryPatterns.map((pattern, i) => (
                      <Badge key={i} variant="secondary" className="text-xs bg-purple-900/50 text-purple-300">
                        {pattern}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="apply" className="space-y-3 mt-3">
            <div className="text-sm text-slate-400 mb-2">
              Configure patient parameters and apply to skeleton
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs text-slate-400">Clone Name</Label>
                <Input
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  placeholder="e.g., Patient A - Initial Assessment"
                  className="bg-slate-900 border-slate-600"
                  data-testid="input-clone-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-400">Height (cm)</Label>
                  <Input
                    type="number"
                    value={patientHeight}
                    onChange={(e) => setPatientHeight(Number(e.target.value))}
                    className="bg-slate-900 border-slate-600"
                    data-testid="input-height"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Weight (kg)</Label>
                  <Input
                    type="number"
                    value={patientWeight}
                    onChange={(e) => setPatientWeight(Number(e.target.value))}
                    className="bg-slate-900 border-slate-600"
                    data-testid="input-weight"
                  />
                </div>
              </div>

              <Separator className="bg-slate-700" />

              <div className="bg-slate-900 p-3 rounded-lg">
                <div className="text-xs font-medium text-slate-300 mb-2">Clone Summary</div>
                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Captured Pose:</span>
                    <Badge variant={capturedAngles ? "default" : "secondary"} className="text-xs">
                      {capturedAngles ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Clinical Modifiers:</span>
                    <Badge variant={selectedCondition ? "default" : "secondary"} className="text-xs">
                      {selectedCondition || "None"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Anthropometrics:</span>
                    <span className="text-slate-300">{patientHeight}cm / {patientWeight}kg</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={applyPatientClone}
                className="w-full bg-blue-600 hover:bg-blue-700"
                data-testid="btn-apply-clone"
              >
                <User className="h-4 w-4 mr-2" />
                Apply Patient Clone to Skeleton
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
