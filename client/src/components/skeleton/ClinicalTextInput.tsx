import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, Sparkles, X, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export interface ParsedPainMarker {
  anatomical_label: string;
  type: "point" | "area" | "referred";
  symptom_type: string;
  description: string;
}

export interface ParsedMuscleState {
  muscle_id: string;
  pathology: string;
  tension_offset: number;
  activation_offset: number;
  inhibition: number;
}

export interface ParsedRegionHighlight {
  region: string;
  type: string;
  severity: number;
  label: string;
}

export interface ClinicalParseResult {
  pain_markers: ParsedPainMarker[];
  muscle_states: ParsedMuscleState[];
  postural_deviations: Record<string, number>;
  region_highlights: ParsedRegionHighlight[];
  clinical_summary: string;
}

interface ClinicalTextInputProps {
  onParseResult: (result: ClinicalParseResult) => void;
  disabled?: boolean;
}

const EXAMPLE_DESCRIPTIONS = [
  "45-year-old with right shoulder pain, rotator cuff weakness, and forward head posture",
  "Runner with bilateral knee pain, tight IT bands, and overpronation",
  "Office worker with low back pain radiating to left leg, anterior pelvic tilt, upper crossed syndrome",
  "Tennis player with right lateral epicondyle pain and grip weakness",
];

export default function ClinicalTextInput({ onParseResult, disabled }: ClinicalTextInputProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ClinicalParseResult | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [showExamples, setShowExamples] = useState(false);
  const { toast } = useToast();

  const handleParse = useCallback(async () => {
    if (!text.trim() || text.trim().length < 5) {
      toast({ title: "Too Short", description: "Please enter a more detailed clinical description.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/clinical-text/parse", { text: text.trim() });
      const result: ClinicalParseResult = await res.json();
      setLastResult(result);
      onParseResult(result);

      const counts = [];
      if (result.pain_markers.length > 0) counts.push(`${result.pain_markers.length} pain marker${result.pain_markers.length > 1 ? "s" : ""}`);
      if (result.muscle_states.length > 0) counts.push(`${result.muscle_states.length} muscle state${result.muscle_states.length > 1 ? "s" : ""}`);
      const deviationCount = Object.keys(result.postural_deviations).length;
      if (deviationCount > 0) counts.push(`${deviationCount} postural change${deviationCount > 1 ? "s" : ""}`);
      if (result.region_highlights.length > 0) counts.push(`${result.region_highlights.length} region${result.region_highlights.length > 1 ? "s" : ""}`);

      toast({
        title: "Skeleton Updated",
        description: counts.length > 0 ? `Applied: ${counts.join(", ")}` : "No specific findings detected.",
      });
    } catch (err) {
      console.error("Clinical text parse error:", err);
      toast({ title: "Parse Error", description: "Failed to analyze the clinical description. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [text, onParseResult, toast]);

  const handleExampleClick = useCallback((example: string) => {
    setText(example);
    setShowExamples(false);
  }, []);

  const handleClear = useCallback(() => {
    setText("");
    setLastResult(null);
  }, []);

  return (
    <Card className="border-blue-500/30 bg-gradient-to-b from-blue-950/20 to-transparent">
      <CardHeader className="py-2 px-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-blue-400" />
            Clinical Text to Skeleton
          </span>
          <span className="flex items-center gap-1">
            {lastResult && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-900/40 text-blue-300">
                Active
              </Badge>
            )}
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </span>
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent className="px-3 pb-3 pt-0 space-y-2">
          <div className="relative">
            <Textarea
              placeholder="Describe the patient's presentation... e.g., '35-year-old with right shoulder impingement, weak rotator cuff, and increased thoracic kyphosis'"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[72px] text-xs bg-black/30 border-gray-700 resize-none pr-7"
              disabled={loading || disabled}
            />
            {text && (
              <button
                onClick={handleClear}
                className="absolute top-1.5 right-1.5 p-0.5 rounded hover:bg-gray-700/60 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              onClick={handleParse}
              disabled={loading || !text.trim() || disabled}
              className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-500 flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" />
                  Visualize on Skeleton
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowExamples(!showExamples)}
              className="h-7 text-xs px-2 border-gray-700"
            >
              Examples
            </Button>
          </div>

          {showExamples && (
            <div className="space-y-1">
              {EXAMPLE_DESCRIPTIONS.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(ex)}
                  className="w-full text-left text-[10px] px-2 py-1.5 rounded bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 transition-colors border border-gray-700/50"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}

          {lastResult && (
            <div className="space-y-1.5 pt-1 border-t border-gray-700/50">
              {lastResult.clinical_summary && (
                <p className="text-[10px] text-blue-300 italic">{lastResult.clinical_summary}</p>
              )}
              <div className="flex flex-wrap gap-1">
                {lastResult.pain_markers.length > 0 && (
                  <Badge variant="secondary" className="text-[9px] bg-red-900/30 text-red-300 border-red-700/30">
                    {lastResult.pain_markers.length} Pain
                  </Badge>
                )}
                {lastResult.muscle_states.length > 0 && (
                  <Badge variant="secondary" className="text-[9px] bg-orange-900/30 text-orange-300 border-orange-700/30">
                    {lastResult.muscle_states.length} Muscles
                  </Badge>
                )}
                {Object.keys(lastResult.postural_deviations).length > 0 && (
                  <Badge variant="secondary" className="text-[9px] bg-purple-900/30 text-purple-300 border-purple-700/30">
                    {Object.keys(lastResult.postural_deviations).length} Posture
                  </Badge>
                )}
                {lastResult.region_highlights.length > 0 && (
                  <Badge variant="secondary" className="text-[9px] bg-green-900/30 text-green-300 border-green-700/30">
                    {lastResult.region_highlights.length} Regions
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
