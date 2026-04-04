import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2, AlertTriangle, HelpCircle, X, Loader2,
  RefreshCw, Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type {
  ClinicalExtractionResult,
  InputSourceLabel,
  UnifiedIntakeData,
} from "@shared/clinicalIntakeTypes";

const SOURCE_LABELS: Record<InputSourceLabel, { label: string; color: string }> = {
  manual_form: { label: "Form", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  free_text: { label: "Text", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  voice_transcription: { label: "Voice", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  pain_markers: { label: "Markers", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  soap_note: { label: "SOAP", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  clinical_conversation: { label: "Chat", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
};

interface ExtractionResultsPanelProps {
  result: ClinicalExtractionResult;
  onClose: () => void;
  onUpdateResult: (result: ClinicalExtractionResult) => void;
  buildIntakePayload: () => UnifiedIntakeData;
}

export default function ExtractionResultsPanel({
  result,
  onClose,
  onUpdateResult,
  buildIntakePayload,
}: ExtractionResultsPanelProps) {
  const { toast } = useToast();
  const [missingAnswers, setMissingAnswers] = useState<Record<string, string>>({});
  const [isReExtracting, setIsReExtracting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const updateAnswer = useCallback((fieldName: string, value: string) => {
    setMissingAnswers(prev => ({ ...prev, [fieldName]: value }));
  }, []);

  const answeredCount = Object.values(missingAnswers).filter(v => v.trim().length > 0).length;

  const handleReExtract = useCallback(async () => {
    const answered = Object.entries(missingAnswers)
      .filter(([, v]) => v.trim().length > 0)
      .map(([field, answer]) => {
        const question = result.missingFields.find(m => m.fieldName === field);
        return `${question?.promptQuestion ?? field}: ${answer.trim()}`;
      });

    if (answered.length === 0) {
      toast({ title: "No answers provided", description: "Please answer at least one question before updating.", variant: "destructive" });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsReExtracting(true);

    try {
      const payload = buildIntakePayload();
      const supplementaryText = `\n\nAdditional clinical information provided:\n${answered.join("\n")}`;
      payload.freeText = payload.freeText
        ? payload.freeText + supplementaryText
        : supplementaryText.trim();

      if (!payload.sources.includes("free_text")) {
        payload.sources.push("free_text");
      }

      const response = await fetch("/api/clinical/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Re-extraction failed");
      const updated: ClinicalExtractionResult = await response.json();
      if (controller.signal.aborted) return;

      onUpdateResult(updated);
      setMissingAnswers({});
      toast({ title: "Extraction updated", description: `Incorporated ${answered.length} answer(s). ${updated.missingFields.length} question(s) remaining.` });
    } catch (err) {
      if (controller.signal.aborted) return;
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      if (!controller.signal.aborted) setIsReExtracting(false);
    }
  }, [missingAnswers, result.missingFields, buildIntakePayload, onUpdateResult, toast]);

  return (
    <Card className="border-slate-700 h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Extraction Results
          </div>
          <div className="flex items-center gap-2">
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
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden pt-0 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-2">
            {result.mainComplaint && (
              <ResultSection title="Main Complaint">
                <p className="text-xs text-slate-300">{result.mainComplaint}</p>
              </ResultSection>
            )}

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
              <>
                <Separator className="border-slate-700" />
                <ResultSection title="Missing Information — Answer Below">
                  <div className="space-y-2.5">
                    {result.missingFields.map((m) => (
                      <div key={m.fieldName} className="space-y-1">
                        <div className="flex items-start gap-1.5">
                          <HelpCircle className={`h-3 w-3 mt-0.5 flex-shrink-0 ${m.importance === "critical" ? "text-red-400" : m.importance === "important" ? "text-yellow-400" : "text-slate-400"}`} />
                          <span className="text-xs text-slate-300">{m.promptQuestion}</span>
                          <Badge variant="outline" className="text-[10px] flex-shrink-0">{m.importance}</Badge>
                        </div>
                        <Input
                          placeholder="Type your answer..."
                          className="h-7 text-xs bg-slate-800/60 border-slate-600 focus:border-blue-500"
                          value={missingAnswers[m.fieldName] ?? ""}
                          onChange={(e) => updateAnswer(m.fieldName, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </ResultSection>

                <Button
                  onClick={handleReExtract}
                  disabled={isReExtracting || answeredCount === 0}
                  size="sm"
                  className="w-full gap-2"
                  variant="secondary"
                >
                  {isReExtracting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Re-extracting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      Update Extraction ({answeredCount} answer{answeredCount !== 1 ? "s" : ""})
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </ScrollArea>
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
