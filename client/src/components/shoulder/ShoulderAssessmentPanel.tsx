import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  AlertTriangle,
  Brain,
  Activity,
  Stethoscope,
  ClipboardCheck,
  Dumbbell,
  ArrowRight,
  Info,
  Zap,
  Target,
  X,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  SHOULDER_SPECIAL_TESTS,
  SHOULDER_MUSCLE_TESTS,
  SHOULDER_ROM_NORMS,
  SHOULDER_DIFFERENTIALS,
  SHOULDER_PAIN_ZONES,
  SHOULDER_ASSESSMENT_STEPS,
  KINETIC_CHAIN_CONTRIBUTORS,
  CAPSULAR_PATTERN,
  OUTCOME_MEASURES,
  analyzeKineticChain,
  detectCapsularPattern,
  generateDifferentialScores,
  buildShoulderAssessmentPrompt,
  type AssessmentFindings,
  type SpecialTest,
  type KineticChainContributor
} from "@/lib/shoulderAssessment";

interface ShoulderAssessmentPanelProps {
  modelConfig: any;
  onSendToChat: (message: string) => void;
  onClose: () => void;
  side: 'left' | 'right';
}

type StepId = 'history' | 'observation' | 'arom' | 'prom' | 'resisted' | 'special_tests' | 'neurological' | 'functional' | 'kinetic_chain' | 'summary';

const STEP_ORDER: StepId[] = ['history', 'observation', 'arom', 'prom', 'resisted', 'special_tests', 'neurological', 'functional', 'kinetic_chain', 'summary'];

const STEP_ICONS: Record<StepId, any> = {
  history: ClipboardCheck,
  observation: Activity,
  arom: Dumbbell,
  prom: Dumbbell,
  resisted: Zap,
  special_tests: Stethoscope,
  neurological: Brain,
  functional: Target,
  kinetic_chain: ArrowRight,
  summary: Check
};

const STEP_LABELS: Record<StepId, string> = {
  history: 'History',
  observation: 'Observation',
  arom: 'Active ROM',
  prom: 'Passive ROM',
  resisted: 'Resisted',
  special_tests: 'Special Tests',
  neurological: 'Neuro Screen',
  functional: 'Functional',
  kinetic_chain: 'Kinetic Chain',
  summary: 'Summary'
};

export default function ShoulderAssessmentPanel({ modelConfig, onSendToChat, onClose, side }: ShoulderAssessmentPanelProps) {
  const [currentStep, setCurrentStep] = useState<StepId>('history');
  const [findings, setFindings] = useState<AssessmentFindings>({
    history: {},
    observation: {},
    arom: {},
    prom: {},
    resistedTests: {},
    specialTests: {},
    neurological: {},
    palpation: {},
    functional: {},
    painZones: [],
    kineticChain: {},
    side
  });
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [expandedContributor, setExpandedContributor] = useState<string | null>(null);

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);

  const updateFinding = useCallback((category: keyof AssessmentFindings, key: string, value: any) => {
    setFindings(prev => ({
      ...prev,
      [category]: typeof prev[category] === 'object' && !Array.isArray(prev[category])
        ? { ...(prev[category] as Record<string, any>), [key]: value }
        : prev[category]
    }));
  }, []);

  const toggleMultiSelect = useCallback((category: keyof AssessmentFindings, key: string, option: string) => {
    setFindings(prev => {
      const current = ((prev[category] as Record<string, any>)?.[key] as string[]) || [];
      const updated = current.includes(option)
        ? current.filter((o: string) => o !== option)
        : [...current, option];
      return {
        ...prev,
        [category]: { ...(prev[category] as Record<string, any>), [key]: updated }
      };
    });
  }, []);

  const kineticChainResults = useMemo(() => analyzeKineticChain(modelConfig, side), [modelConfig, side]);

  const capsularAnalysis = useMemo(() => {
    const romData: Record<string, number> = {};
    if (findings.prom.promFlexion) romData.flexion = findings.prom.promFlexion;
    if (findings.prom.promAbduction) romData.abduction = findings.prom.promAbduction;
    if (findings.prom.promER) romData.externalRotation = findings.prom.promER;
    if (findings.prom.promIR) romData.internalRotation = findings.prom.promIR;
    return detectCapsularPattern(romData);
  }, [findings.prom]);

  const differentialScores = useMemo(() => generateDifferentialScores(findings), [findings]);

  const goNext = () => {
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx < STEP_ORDER.length - 1) setCurrentStep(STEP_ORDER[idx + 1]);
  };

  const goPrev = () => {
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx > 0) setCurrentStep(STEP_ORDER[idx - 1]);
  };

  const sendFullAssessment = () => {
    const prompt = buildShoulderAssessmentPrompt(findings, kineticChainResults, capsularAnalysis, differentialScores);
    onSendToChat(prompt);
  };

  const renderStepContent = () => {
    if (currentStep === 'kinetic_chain') return renderKineticChain();
    if (currentStep === 'summary') return renderSummary();
    if (currentStep === 'special_tests') return renderSpecialTests();

    const stepData = SHOULDER_ASSESSMENT_STEPS.find(s => s.id === currentStep);
    if (!stepData) return null;

    const categoryMap: Record<string, keyof AssessmentFindings> = {
      history: 'history',
      observation: 'observation',
      arom: 'arom',
      prom: 'prom',
      resisted: 'resistedTests',
      neurological: 'neurological',
      functional: 'functional'
    };

    const category = categoryMap[currentStep] || 'history';

    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-500 italic">{stepData.description}</p>
        {stepData.items.map(item => (
          <div key={item.id} className="space-y-1">
            <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
              {item.label}
              {item.required && <span className="text-red-500">*</span>}
            </label>
            {item.type === 'select' && (
              <div className="flex flex-wrap gap-1">
                {item.options?.map(opt => {
                  const isSelected = (findings[category] as Record<string, any>)?.[item.id] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => updateFinding(category, item.id, opt)}
                      className={`px-2 py-1 text-[10px] rounded-md border transition-colors ${
                        isSelected
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
            {item.type === 'multiselect' && (
              <div className="flex flex-wrap gap-1">
                {item.options?.map(opt => {
                  const selected = ((findings[category] as Record<string, any>)?.[item.id] as string[]) || [];
                  const isSelected = selected.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => toggleMultiSelect(category, item.id, opt)}
                      className={`px-2 py-1 text-[10px] rounded-md border transition-colors ${
                        isSelected
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
            {item.type === 'scale' && (
              <div className="flex items-center gap-2">
                <Slider
                  value={[(findings[category] as Record<string, any>)?.[item.id] || item.scaleRange?.[0] || 0]}
                  min={item.scaleRange?.[0] || 0}
                  max={item.scaleRange?.[1] || 10}
                  step={1}
                  onValueChange={([v]) => updateFinding(category, item.id, v)}
                  className="flex-1"
                />
                <span className="text-xs font-mono w-8 text-center">
                  {(findings[category] as Record<string, any>)?.[item.id] || item.scaleRange?.[0] || 0}
                </span>
              </div>
            )}
            {item.type === 'rom' && (
              <div className="flex items-center gap-2">
                <Slider
                  value={[(findings[category] as Record<string, any>)?.[item.id] || 0]}
                  min={item.scaleRange?.[0] || 0}
                  max={item.scaleRange?.[1] || 180}
                  step={5}
                  onValueChange={([v]) => updateFinding(category, item.id, v)}
                  className="flex-1"
                />
                <span className="text-xs font-mono w-10 text-center">
                  {(findings[category] as Record<string, any>)?.[item.id] || 0}°
                </span>
                {item.configKey && (() => {
                  const norm = SHOULDER_ROM_NORMS.find(n => n.configKey === item.configKey);
                  if (!norm) return null;
                  const val = (findings[category] as Record<string, any>)?.[item.id] || 0;
                  const isRestricted = val < norm.normalRange[0];
                  const isBelowFunctional = val < norm.functionalMinimum;
                  return (
                    <span className={`text-[9px] ${isBelowFunctional ? 'text-red-500 font-bold' : isRestricted ? 'text-amber-500' : 'text-green-500'}`}>
                      {isBelowFunctional ? 'Below functional' : isRestricted ? 'Restricted' : 'Normal'}
                      <span className="text-gray-400 ml-1">({norm.normalRange[0]}-{norm.normalRange[1]}°)</span>
                    </span>
                  );
                })()}
              </div>
            )}
            {item.type === 'text' && (
              <Input
                value={(findings[category] as Record<string, any>)?.[item.id] || ''}
                onChange={e => updateFinding(category, item.id, e.target.value)}
                placeholder={`Enter ${item.label.toLowerCase()}...`}
                className="h-7 text-xs"
              />
            )}
            {item.type === 'boolean' && (
              <div className="flex gap-2">
                <button
                  onClick={() => updateFinding(category, item.id, true)}
                  className={`px-3 py-1 text-[10px] rounded-md border ${
                    (findings[category] as Record<string, any>)?.[item.id] === true
                      ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >Yes</button>
                <button
                  onClick={() => updateFinding(category, item.id, false)}
                  className={`px-3 py-1 text-[10px] rounded-md border ${
                    (findings[category] as Record<string, any>)?.[item.id] === false
                      ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >No</button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderSpecialTests = () => {
    const categories = ['impingement', 'rotator_cuff', 'instability', 'labral', 'biceps', 'ac_joint', 'thoracic_outlet', 'neurological'] as const;
    const categoryLabels: Record<string, string> = {
      impingement: 'Impingement',
      rotator_cuff: 'Rotator Cuff',
      instability: 'Instability',
      labral: 'Labral',
      biceps: 'Biceps',
      ac_joint: 'AC Joint',
      thoracic_outlet: 'Thoracic Outlet',
      neurological: 'Neurological'
    };

    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-500 italic">Select and record results of relevant special tests. Tap a test name for details including technique and clinical accuracy.</p>
        {categories.map(cat => {
          const tests = SHOULDER_SPECIAL_TESTS.filter(t => t.category === cat);
          if (tests.length === 0) return null;
          return (
            <div key={cat} className="space-y-1">
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{categoryLabels[cat]}</h4>
              {tests.map(test => {
                const testKey = `test_${test.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
                const result = findings.specialTests[testKey];
                const isExpanded = expandedTest === testKey;

                return (
                  <div key={testKey} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-1 p-1.5">
                      <button
                        onClick={() => setExpandedTest(isExpanded ? null : testKey)}
                        className="flex-1 text-left flex items-center gap-1"
                      >
                        {isExpanded ? <ChevronUp className="h-3 w-3 text-gray-400" /> : <ChevronDown className="h-3 w-3 text-gray-400" />}
                        <span className="text-[11px] font-medium">{test.name}</span>
                      </button>
                      <div className="flex gap-0.5">
                        {(['positive', 'negative', 'equivocal'] as const).map(r => (
                          <button
                            key={r}
                            onClick={() => updateFinding('specialTests', testKey, result === r ? 'not_tested' : r)}
                            className={`px-1.5 py-0.5 text-[9px] rounded border transition-colors ${
                              result === r
                                ? r === 'positive' ? 'bg-red-500 text-white border-red-500'
                                  : r === 'negative' ? 'bg-green-500 text-white border-green-500'
                                  : 'bg-amber-500 text-white border-amber-500'
                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {r === 'positive' ? '+' : r === 'negative' ? '−' : '?'}
                          </button>
                        ))}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-2 pb-2 space-y-1 bg-gray-50 border-t">
                        <p className="text-[10px] text-gray-600"><strong>Purpose:</strong> {test.purpose}</p>
                        <p className="text-[10px] text-gray-600"><strong>Technique:</strong> {test.technique}</p>
                        <p className="text-[10px] text-gray-600"><strong>Positive:</strong> {test.positiveSign}</p>
                        <div className="flex gap-2 text-[9px]">
                          <span className="text-blue-600">Sens: {(test.sensitivity * 100).toFixed(0)}%</span>
                          <span className="text-purple-600">Spec: {(test.specificity * 100).toFixed(0)}%</span>
                          <span className="text-amber-600">LR+: {test.positiveLR.toFixed(1)}</span>
                          <span className="text-gray-500">LR−: {test.negativeLR.toFixed(2)}</span>
                        </div>
                        <p className="text-[9px] text-gray-500 italic">{test.clinicalNote}</p>
                        <p className="text-[9px] text-gray-500"><strong>Implicates:</strong> {test.implicates.join(', ')}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const renderKineticChain = () => {
    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-500 italic">Analysis of how other body regions may contribute to the shoulder presentation. Based on current skeleton posture data.</p>
        {kineticChainResults.map((result, idx) => {
          const contributor = KINETIC_CHAIN_CONTRIBUTORS[idx];
          const isExpanded = expandedContributor === result.region;
          const severityColors = {
            none: 'bg-green-50 border-green-200 text-green-700',
            mild: 'bg-yellow-50 border-yellow-200 text-yellow-700',
            moderate: 'bg-orange-50 border-orange-200 text-orange-700',
            significant: 'bg-red-50 border-red-200 text-red-700'
          };

          return (
            <div key={result.region} className={`border rounded-lg overflow-hidden ${severityColors[result.severity]}`}>
              <button
                onClick={() => setExpandedContributor(isExpanded ? null : result.region)}
                className="w-full flex items-center justify-between p-2"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[9px] ${
                    result.severity === 'none' ? 'border-green-400 text-green-600' :
                    result.severity === 'mild' ? 'border-yellow-400 text-yellow-600' :
                    result.severity === 'moderate' ? 'border-orange-400 text-orange-600' :
                    'border-red-400 text-red-600'
                  }`}>
                    {result.severity === 'none' ? 'Normal' : result.severity}
                  </Badge>
                  <span className="text-[11px] font-medium">{result.region}</span>
                </div>
                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {isExpanded && contributor && (
                <div className="px-2 pb-2 space-y-1.5 border-t bg-white/50">
                  <p className="text-[10px] text-gray-700"><strong>Relationship:</strong> {contributor.relationship}</p>
                  <p className="text-[10px] text-gray-700"><strong>Current Values:</strong> {result.detail}</p>
                  <p className="text-[10px] text-gray-700"><strong>Assessment:</strong> {contributor.assessmentMethod}</p>
                  <p className="text-[10px] text-gray-700"><strong>Compensatory Pattern:</strong> {contributor.compensatoryPattern}</p>
                  <p className="text-[10px] text-blue-600"><strong>Treatment:</strong> {contributor.treatmentImplication}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderSummary = () => {
    const topDx = differentialScores.slice(0, 5);
    const completedSteps = STEP_ORDER.filter(step => {
      if (step === 'summary' || step === 'kinetic_chain') return true;
      const category = step === 'resisted' ? 'resistedTests' : step === 'special_tests' ? 'specialTests' : step;
      const data = findings[category as keyof AssessmentFindings];
      return data && typeof data === 'object' && Object.keys(data).length > 0;
    });

    const significantKineticChain = kineticChainResults.filter(r => r.severity !== 'none');

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
          <h4 className="text-xs font-bold text-blue-800 mb-1">Assessment Completeness</h4>
          <div className="flex flex-wrap gap-1">
            {STEP_ORDER.filter(s => s !== 'summary').map(step => {
              const done = completedSteps.includes(step);
              return (
                <Badge key={step} variant="outline" className={`text-[9px] ${done ? 'bg-green-100 border-green-300 text-green-700' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
                  {done ? '✓' : '○'} {STEP_LABELS[step]}
                </Badge>
              );
            })}
          </div>
        </div>

        {capsularAnalysis.present && (
          <div className="bg-amber-50 rounded-lg p-2 border border-amber-200">
            <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Capsular Pattern Detected</h4>
            <p className="text-[10px] text-amber-700 mt-1">{capsularAnalysis.detail}</p>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-xs font-bold text-gray-800">Differential Diagnosis Rankings</h4>
          {topDx.map((dx, idx) => (
            <div key={dx.diagnosis.name} className="border rounded-lg p-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold">{idx + 1}. {dx.diagnosis.name}</span>
                <Badge className={`text-[9px] ${dx.score > 70 ? 'bg-red-500' : dx.score > 40 ? 'bg-amber-500' : 'bg-gray-500'}`}>
                  {dx.score}%
                </Badge>
              </div>
              <p className="text-[9px] text-gray-500">ICD-10: {dx.diagnosis.icd10} | {dx.diagnosis.prevalence} | {dx.diagnosis.ageGroup}</p>
              {dx.supportingEvidence.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {dx.supportingEvidence.map((ev, i) => (
                    <Badge key={i} variant="outline" className="text-[8px] bg-green-50 border-green-200 text-green-700">✓ {ev}</Badge>
                  ))}
                </div>
              )}
              {dx.refutingEvidence.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {dx.refutingEvidence.map((ev, i) => (
                    <Badge key={i} variant="outline" className="text-[8px] bg-red-50 border-red-200 text-red-700">✗ {ev}</Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {significantKineticChain.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-gray-800">Kinetic Chain Contributors</h4>
            {significantKineticChain.map(r => (
              <div key={r.region} className="flex items-center gap-2 text-[10px]">
                <Badge variant="outline" className={`text-[8px] ${
                  r.severity === 'mild' ? 'border-yellow-400 text-yellow-600' :
                  r.severity === 'moderate' ? 'border-orange-400 text-orange-600' :
                  'border-red-400 text-red-600'
                }`}>{r.severity}</Badge>
                <span>{r.region}: {r.detail}</span>
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={sendFullAssessment}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
          size="sm"
        >
          <Brain className="h-3 w-3 mr-1" />
          Send to AI for Full Clinical Analysis
        </Button>
        <p className="text-[9px] text-gray-400 text-center">All assessment data, kinetic chain analysis, and differential rankings will be sent to the AI for comprehensive clinical interpretation</p>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4" />
          <span className="text-sm font-bold">Shoulder Assessment</span>
          <Badge className="bg-white/20 text-white text-[9px]">{side === 'left' ? 'Left' : 'Right'}</Badge>
        </div>
        <button onClick={onClose} className="hover:bg-white/20 rounded p-0.5">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b overflow-x-auto">
        {STEP_ORDER.map((step, idx) => {
          const Icon = STEP_ICONS[step];
          const isCurrent = step === currentStep;
          const isPast = idx < currentStepIndex;
          return (
            <button
              key={step}
              onClick={() => setCurrentStep(step)}
              className={`flex items-center gap-0.5 px-1.5 py-1 rounded text-[9px] whitespace-nowrap transition-colors ${
                isCurrent ? 'bg-teal-500 text-white font-bold' :
                isPast ? 'bg-teal-100 text-teal-700' :
                'bg-white text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Icon className="h-2.5 w-2.5" />
              {STEP_LABELS[step]}
            </button>
          );
        })}
      </div>

      <ScrollArea className="flex-1 px-3 py-2">
        {renderStepContent()}
      </ScrollArea>

      <div className="flex items-center justify-between px-3 py-2 border-t bg-gray-50">
        <Button
          variant="outline"
          size="sm"
          onClick={goPrev}
          disabled={currentStepIndex === 0}
          className="h-7 text-xs"
        >
          <ChevronLeft className="h-3 w-3 mr-1" /> Back
        </Button>
        <span className="text-[10px] text-gray-500">{currentStepIndex + 1} / {STEP_ORDER.length}</span>
        {currentStepIndex < STEP_ORDER.length - 1 ? (
          <Button
            size="sm"
            onClick={goNext}
            className="h-7 text-xs bg-teal-500 hover:bg-teal-600"
          >
            Next <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={sendFullAssessment}
            className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
          >
            <Brain className="h-3 w-3 mr-1" /> Analyze
          </Button>
        )}
      </div>
    </div>
  );
}
