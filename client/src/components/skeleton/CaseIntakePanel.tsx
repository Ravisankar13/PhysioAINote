import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ClipboardList, AlertTriangle, Mic, MicOff, FileText,
  MapPin, Zap, ChevronRight, Loader2, CheckCircle2, XCircle,
  Info, HelpCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type {
  UnifiedIntakeData,
  ClinicalExtractionResult,
  ManualFormInput,
  PainMarkerSummary,
  PainSide,
  MissingField,
  InputSourceLabel,
} from "../../../shared/clinicalIntakeTypes";

const BODY_REGIONS = [
  { value: "cervical", label: "Neck / Cervical Spine" },
  { value: "thoracic", label: "Upper Back / Thoracic Spine" },
  { value: "lumbar", label: "Lower Back / Lumbar Spine" },
  { value: "shoulder", label: "Shoulder" },
  { value: "elbow", label: "Elbow" },
  { value: "wrist_hand", label: "Wrist / Hand" },
  { value: "hip", label: "Hip" },
  { value: "knee", label: "Knee" },
  { value: "ankle_foot", label: "Ankle / Foot" },
  { value: "pelvis", label: "Pelvis / SI Joint" },
];

const DURATION_OPTIONS = [
  { value: "acute", label: "Acute (0-2 weeks)" },
  { value: "subacute", label: "Sub-acute (2-6 weeks)" },
  { value: "chronic", label: "Chronic (6+ weeks)" },
  { value: "recurrent", label: "Recurrent episodes" },
];

const ONSET_OPTIONS = [
  { value: "sudden", label: "Sudden / Traumatic" },
  { value: "gradual", label: "Gradual / Insidious" },
  { value: "unknown", label: "Unknown / No clear trigger" },
];

const AGGRAVATING_FACTORS = [
  "Lifting", "Bending", "Sitting", "Standing", "Walking", "Running",
  "Reaching overhead", "Pushing", "Pulling", "Twisting", "Stairs",
  "Morning stiffness", "End of day", "Sustained postures", "Repetitive movements",
];

const EASING_FACTORS = [
  "Rest", "Movement", "Heat", "Ice", "Medication", "Position change",
  "Stretching", "Massage", "Support/bracing", "Lying down",
];

const PAIN_NATURE = [
  { value: "sharp", label: "Sharp / Stabbing" },
  { value: "dull", label: "Dull / Aching" },
  { value: "burning", label: "Burning" },
  { value: "throbbing", label: "Throbbing" },
  { value: "radiating", label: "Radiating / Shooting" },
  { value: "stiffness", label: "Stiffness" },
  { value: "weakness", label: "Weakness" },
  { value: "numbness", label: "Numbness / Tingling" },
];

const RED_FLAGS = [
  { value: "night_pain", label: "Night pain that wakes from sleep" },
  { value: "weight_loss", label: "Unexplained weight loss" },
  { value: "fever", label: "Fever / Feeling unwell" },
  { value: "bladder_bowel", label: "Bladder / Bowel changes" },
  { value: "saddle_numbness", label: "Saddle area numbness" },
  { value: "progressive_weakness", label: "Progressive weakness" },
  { value: "trauma", label: "Recent significant trauma" },
  { value: "cancer_history", label: "History of cancer" },
  { value: "steroid_use", label: "Long-term steroid use" },
  { value: "age_under_20", label: "Age under 20 with back pain" },
  { value: "age_over_55", label: "Age over 55 with new onset" },
];

const SOURCE_LABELS: Record<InputSourceLabel, { label: string; color: string }> = {
  manual_form: { label: "Form", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  free_text: { label: "Text", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  voice_transcription: { label: "Voice", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  pain_markers: { label: "Markers", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  soap_note: { label: "SOAP", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  clinical_conversation: { label: "Chat", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
};

interface CaseIntakePanelProps {
  painMarkers: PainMarkerSummary[];
  onExtractionComplete: (result: ClinicalExtractionResult) => void;
  className?: string;
}

export default function CaseIntakePanel({
  painMarkers,
  onExtractionComplete,
  className,
}: CaseIntakePanelProps) {
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  const [manualForm, setManualForm] = useState<ManualFormInput>({
    painLocation: "",
    painSide: "bilateral",
    duration: "",
    onset: "",
    aggravatingFactors: [],
    easingFactors: [],
    painNature: "",
    painSeverity: 5,
    functionalLimitations: "",
    redFlags: [],
    additionalNotes: "",
    mainComplaint: "",
    priorTreatment: "",
    goals: "",
    recurrence: "",
  });

  const [freeText, setFreeText] = useState("");
  const [voiceTranscription, setVoiceTranscription] = useState("");
  const [mechanismOfInjury, setMechanismOfInjury] = useState("");
  const [patientAge, setPatientAge] = useState<string>("");
  const [patientSex, setPatientSex] = useState("");
  const [relevantHistory, setRelevantHistory] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ClinicalExtractionResult | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const updateForm = useCallback((updates: Partial<ManualFormInput>) => {
    setManualForm(prev => ({ ...prev, ...updates }));
  }, []);

  const toggleArrayItem = useCallback(
    (field: "aggravatingFactors" | "easingFactors" | "redFlags", value: string) => {
      setManualForm(prev => {
        const current = prev[field];
        const updated = current.includes(value)
          ? current.filter(item => item !== value)
          : [...current, value];
        return { ...prev, [field]: updated };
      });
    },
    [],
  );

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribeBlob(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  const transcribeBlob = async (blob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      const res = await fetch("/api/transcribe-audio", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Transcription failed");
      const data = await res.json();
      setVoiceTranscription(prev =>
        prev ? `${prev}\n${data.transcription || data.text || ""}` : (data.transcription || data.text || ""),
      );
      toast({ title: "Voice transcribed" });
    } catch {
      toast({ title: "Transcription failed", variant: "destructive" });
    }
  };

  const buildIntakePayload = useCallback((): UnifiedIntakeData => {
    const sources: InputSourceLabel[] = [];
    const hasForm = manualForm.painLocation || manualForm.duration || manualForm.aggravatingFactors.length > 0 || manualForm.redFlags.length > 0;
    if (hasForm) sources.push("manual_form");
    if (freeText.length > 5) sources.push("free_text");
    if (voiceTranscription.length > 5) sources.push("voice_transcription");
    if (painMarkers.length > 0) sources.push("pain_markers");

    return {
      sources,
      manualForm: hasForm ? manualForm : null,
      freeText,
      voiceTranscription,
      painMarkers,
      mechanismOfInjury,
      patientAge: patientAge ? parseInt(patientAge, 10) : null,
      patientSex,
      relevantHistory,
    };
  }, [manualForm, freeText, voiceTranscription, painMarkers, mechanismOfInjury, patientAge, patientSex, relevantHistory]);

  const runExtraction = useCallback(async () => {
    const payload = buildIntakePayload();
    if (payload.sources.length === 0) {
      toast({ title: "No data entered", description: "Fill in at least one section before extracting.", variant: "destructive" });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsExtracting(true);
    setExtractionResult(null);

    try {
      const res = await apiRequest("POST", "/api/clinical/extract", payload);
      if (controller.signal.aborted) return;
      const result: ClinicalExtractionResult = await res.json();
      setExtractionResult(result);
      onExtractionComplete(result);
      toast({ title: "Extraction complete", description: `${result.bodyRegions.length} region(s), ${result.symptoms.length} symptom(s) found.` });
    } catch (err) {
      if (controller.signal.aborted) return;
      toast({ title: "Extraction failed", variant: "destructive" });
    } finally {
      if (!controller.signal.aborted) setIsExtracting(false);
    }
  }, [buildIntakePayload, onExtractionComplete, toast]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const hasRedFlags = manualForm.redFlags.length > 0;
  const dataSourceCount = buildIntakePayload().sources.length;

  return (
    <Card className={`${className ?? ""} border-slate-700`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-500" />
            Case Intake & Extraction
          </div>
          <div className="flex items-center gap-2">
            {dataSourceCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {dataSourceCount} source{dataSourceCount !== 1 ? "s" : ""}
              </Badge>
            )}
            {hasRedFlags && (
              <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" />
                Red Flags
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <Tabs defaultValue="form" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-9">
            <TabsTrigger value="form" className="text-xs gap-1">
              <ClipboardList className="h-3 w-3" /> Form
            </TabsTrigger>
            <TabsTrigger value="text" className="text-xs gap-1">
              <FileText className="h-3 w-3" /> Free Text
            </TabsTrigger>
            <TabsTrigger value="voice" className="text-xs gap-1">
              <Mic className="h-3 w-3" /> Voice
            </TabsTrigger>
            <TabsTrigger value="context" className="text-xs gap-1">
              <Info className="h-3 w-3" /> Context
            </TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="mt-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Pain Location</Label>
                <Select value={manualForm.painLocation} onValueChange={(v) => updateForm({ painLocation: v })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select body region..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BODY_REGIONS.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Side</Label>
                <Select value={manualForm.painSide} onValueChange={(v) => updateForm({ painSide: v as PainSide })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                    <SelectItem value="bilateral">Bilateral / Both</SelectItem>
                    <SelectItem value="central">Central</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Duration</Label>
                <Select value={manualForm.duration} onValueChange={(v) => updateForm({ duration: v })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="How long?" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Onset</Label>
                <Select value={manualForm.onset} onValueChange={(v) => updateForm({ onset: v })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="How did it start?" />
                  </SelectTrigger>
                  <SelectContent>
                    {ONSET_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Pain Nature</Label>
                <Select value={manualForm.painNature} onValueChange={(v) => updateForm({ painNature: v })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Type of pain..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PAIN_NATURE.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Severity: {manualForm.painSeverity}/10</Label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={manualForm.painSeverity}
                  onChange={(e) => updateForm({ painSeverity: parseInt(e.target.value) })}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>No pain</span>
                  <span>Worst pain</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">What Makes It Worse?</Label>
              <div className="flex flex-wrap gap-1.5">
                {AGGRAVATING_FACTORS.map(f => (
                  <Badge
                    key={f}
                    variant={manualForm.aggravatingFactors.includes(f) ? "default" : "outline"}
                    className="cursor-pointer text-[10px] px-1.5 py-0.5 hover:bg-red-500/20"
                    onClick={() => toggleArrayItem("aggravatingFactors", f)}
                  >
                    {f}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">What Makes It Better?</Label>
              <div className="flex flex-wrap gap-1.5">
                {EASING_FACTORS.map(f => (
                  <Badge
                    key={f}
                    variant={manualForm.easingFactors.includes(f) ? "default" : "outline"}
                    className="cursor-pointer text-[10px] px-1.5 py-0.5 hover:bg-green-500/20"
                    onClick={() => toggleArrayItem("easingFactors", f)}
                  >
                    {f}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                Red Flags
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                {RED_FLAGS.map(flag => (
                  <div key={flag.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`case-${flag.value}`}
                      checked={manualForm.redFlags.includes(flag.value)}
                      onCheckedChange={() => toggleArrayItem("redFlags", flag.value)}
                    />
                    <label htmlFor={`case-${flag.value}`} className="text-xs cursor-pointer">
                      {flag.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Main Complaint</Label>
              <Textarea
                placeholder="Primary reason for seeking treatment..."
                value={manualForm.mainComplaint}
                onChange={(e) => updateForm({ mainComplaint: e.target.value })}
                className="min-h-[50px] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Functional Limitations</Label>
              <Textarea
                placeholder="What activities are affected?"
                value={manualForm.functionalLimitations}
                onChange={(e) => updateForm({ functionalLimitations: e.target.value })}
                className="min-h-[50px] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Prior Treatment</Label>
              <Textarea
                placeholder="Previous treatments tried (physio, medication, surgery, etc.)..."
                value={manualForm.priorTreatment}
                onChange={(e) => updateForm({ priorTreatment: e.target.value })}
                className="min-h-[50px] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Patient Goals</Label>
              <Textarea
                placeholder="What does the patient want to achieve? (e.g., return to sport, reduce pain, improve mobility)"
                value={manualForm.goals}
                onChange={(e) => updateForm({ goals: e.target.value })}
                className="min-h-[50px] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Recurrence</Label>
              <Textarea
                placeholder="Has this happened before? How often? Any pattern?"
                value={manualForm.recurrence}
                onChange={(e) => updateForm({ recurrence: e.target.value })}
                className="min-h-[50px] text-xs"
              />
            </div>
          </TabsContent>

          <TabsContent value="text" className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Paste or type clinical notes</Label>
              <Textarea
                placeholder="e.g. 45yo male presents with 3 months of left shoulder pain, worse with overhead reaching. No trauma. Sharp pain radiating to elbow. Reports difficulty sleeping on affected side..."
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                className="min-h-[150px] text-xs"
              />
              <p className="text-[10px] text-slate-500">
                Paste referral letters, clinical notes, or free-form patient descriptions. The extraction engine will parse and structure the data.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Mechanism of Injury</Label>
              <Textarea
                placeholder="Describe how the injury occurred..."
                value={mechanismOfInjury}
                onChange={(e) => setMechanismOfInjury(e.target.value)}
                className="min-h-[60px] text-xs"
              />
            </div>
          </TabsContent>

          <TabsContent value="voice" className="mt-3 space-y-3">
            <div className="flex flex-col items-center gap-3 py-4">
              <Button
                variant={isRecording ? "destructive" : "default"}
                size="lg"
                onClick={isRecording ? stopRecording : startRecording}
                className="h-16 w-16 rounded-full"
              >
                {isRecording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>
              <p className="text-xs text-slate-400">
                {isRecording ? "Recording... Click to stop" : "Click to record patient description"}
              </p>
            </div>

            {voiceTranscription && (
              <div className="space-y-1.5">
                <Label className="text-xs">Transcription</Label>
                <Textarea
                  value={voiceTranscription}
                  onChange={(e) => setVoiceTranscription(e.target.value)}
                  className="min-h-[100px] text-xs"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="context" className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Patient Age</Label>
                <Input
                  type="number"
                  placeholder="Age"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sex</Label>
                <Select value={patientSex} onValueChange={setPatientSex}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Relevant Medical History</Label>
              <Textarea
                placeholder="Previous injuries, surgeries, conditions, medications..."
                value={relevantHistory}
                onChange={(e) => setRelevantHistory(e.target.value)}
                className="min-h-[80px] text-xs"
              />
            </div>

            {painMarkers.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-orange-400" />
                  Pain Markers from Skeleton ({painMarkers.length})
                </Label>
                <div className="p-2 bg-slate-800 rounded-lg space-y-1">
                  {painMarkers.map(pm => (
                    <div key={pm.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">{pm.region} ({pm.side})</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{pm.type}</Badge>
                        <span className="text-orange-400">{pm.severity}/10</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Separator className="border-slate-700" />

        <div className="flex items-center gap-2">
          <Button
            onClick={runExtraction}
            disabled={isExtracting || dataSourceCount === 0}
            className="flex-1 gap-2"
            size="sm"
          >
            {isExtracting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Run Extraction
              </>
            )}
          </Button>
        </div>

        {extractionResult && (
          <ExtractionResultsView result={extractionResult} />
        )}
      </CardContent>
    </Card>
  );
}

function SourceBadge({ source }: { source: InputSourceLabel | string }) {
  const config = SOURCE_LABELS[source as InputSourceLabel];
  if (!config) return <Badge variant="outline" className="text-[10px]">{source}</Badge>;
  return (
    <Badge variant="outline" className={`text-[10px] px-1 py-0 ${config.color}`}>
      {config.label}
    </Badge>
  );
}

function ExtractionResultsView({ result }: { result: ClinicalExtractionResult }) {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          Extraction Results
        </h4>
        <Badge
          variant="outline"
          className={`text-[10px] ${
            result.overallConfidence >= 0.7
              ? "text-green-400 border-green-500/30"
              : result.overallConfidence >= 0.4
              ? "text-yellow-400 border-yellow-500/30"
              : "text-red-400 border-red-500/30"
          }`}
        >
          {Math.round(result.overallConfidence * 100)}% confidence
        </Badge>
      </div>

      <ScrollArea className="max-h-[300px]">
        <div className="space-y-2 pr-2">
          {result.bodyRegions.length > 0 && (
            <ResultSection title="Body Regions">
              <div className="flex flex-wrap gap-1">
                {result.bodyRegions.map((r, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                    {r.region} ({r.side}) <SourceBadge source={r.sourceLabel} />
                  </Badge>
                ))}
              </div>
            </ResultSection>
          )}

          {result.symptoms.length > 0 && (
            <ResultSection title="Symptoms">
              {result.symptoms.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-slate-300">{s.description}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-orange-400">{s.severity}/10</span>
                    <SourceBadge source={s.sourceLabel} />
                  </div>
                </div>
              ))}
            </ResultSection>
          )}

          <ResultSection title="Timeline">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-slate-500">Duration:</span> <span className="text-slate-200">{result.duration}</span></div>
              <div><span className="text-slate-500">Onset:</span> <span className="text-slate-200">{result.onset}</span></div>
              <div><span className="text-slate-500">Irritability:</span>{" "}
                <span className={
                  result.irritability === "high" ? "text-red-400" :
                  result.irritability === "moderate" ? "text-yellow-400" : "text-green-400"
                }>
                  {result.irritability}
                </span>
              </div>
              {result.mechanism && (
                <div className="col-span-2"><span className="text-slate-500">Mechanism:</span> <span className="text-slate-200">{result.mechanism}</span></div>
              )}
            </div>
          </ResultSection>

          {result.aggravatingFactors.length > 0 && (
            <ResultSection title="Aggravating Factors">
              <div className="flex flex-wrap gap-1">
                {result.aggravatingFactors.map((a, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] text-red-300 border-red-500/20 gap-1">
                    {a.factor} <SourceBadge source={a.sourceLabel} />
                  </Badge>
                ))}
              </div>
            </ResultSection>
          )}

          {result.easingFactors.length > 0 && (
            <ResultSection title="Easing Factors">
              <div className="flex flex-wrap gap-1">
                {result.easingFactors.map((e, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] text-green-300 border-green-500/20 gap-1">
                    {e.factor} <SourceBadge source={e.sourceLabel} />
                  </Badge>
                ))}
              </div>
            </ResultSection>
          )}

          {result.redFlags.length > 0 && (
            <ResultSection title="Red Flags" urgent>
              {result.redFlags.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                  <AlertTriangle className={`h-3 w-3 ${r.urgency === "immediate" ? "text-red-500" : "text-yellow-500"}`} />
                  <span className="text-slate-300">{r.description}</span>
                  <Badge variant="outline" className={`text-[10px] ${r.urgency === "immediate" ? "text-red-400 border-red-500/30" : "text-yellow-400 border-yellow-500/30"}`}>
                    {r.urgency}
                  </Badge>
                  <SourceBadge source={r.sourceLabel} />
                </div>
              ))}
            </ResultSection>
          )}

          {result.functionalLimitations.length > 0 && (
            <ResultSection title="Functional Limitations">
              {result.functionalLimitations.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-slate-300">{f.limitation}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">{f.severity}</Badge>
                    <SourceBadge source={f.sourceLabel} />
                  </div>
                </div>
              ))}
            </ResultSection>
          )}

          {result.missingFields.length > 0 && (
            <ResultSection title="Missing Information">
              {result.missingFields.map((m, i) => (
                <div key={i} className="flex items-start gap-2 text-xs py-0.5">
                  <HelpCircle className={`h-3 w-3 mt-0.5 ${m.importance === "critical" ? "text-red-400" : m.importance === "important" ? "text-yellow-400" : "text-slate-400"}`} />
                  <div>
                    <span className="text-slate-300">{m.promptQuestion}</span>
                    <Badge variant="outline" className="ml-1.5 text-[10px]">{m.importance}</Badge>
                  </div>
                </div>
              ))}
            </ResultSection>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ResultSection({
  title,
  urgent,
  children,
}: {
  title: string;
  urgent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`p-2 rounded-lg ${urgent ? "bg-red-500/10 border border-red-500/20" : "bg-slate-800/50"}`}>
      <h5 className={`text-[11px] font-medium mb-1 ${urgent ? "text-red-400" : "text-slate-400"}`}>
        {title}
      </h5>
      {children}
    </div>
  );
}
