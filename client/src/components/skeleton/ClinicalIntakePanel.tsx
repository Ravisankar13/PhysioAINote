import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, ClipboardList, AlertTriangle } from "lucide-react";

export interface ClinicalIntakeData {
  painLocation: string;
  painSide: 'left' | 'right' | 'bilateral' | 'central';
  duration: string;
  onset: string;
  aggravatingFactors: string[];
  easingFactors: string[];
  painNature: string;
  painSeverity: number;
  functionalLimitations: string;
  redFlags: string[];
  additionalNotes: string;
}

interface ClinicalIntakePanelProps {
  onIntakeChange: (data: ClinicalIntakeData | null) => void;
  className?: string;
}

const BODY_REGIONS = [
  { value: 'cervical', label: 'Neck / Cervical Spine' },
  { value: 'thoracic', label: 'Upper Back / Thoracic Spine' },
  { value: 'lumbar', label: 'Lower Back / Lumbar Spine' },
  { value: 'shoulder', label: 'Shoulder' },
  { value: 'elbow', label: 'Elbow' },
  { value: 'wrist_hand', label: 'Wrist / Hand' },
  { value: 'hip', label: 'Hip' },
  { value: 'knee', label: 'Knee' },
  { value: 'ankle_foot', label: 'Ankle / Foot' },
  { value: 'pelvis', label: 'Pelvis / SI Joint' },
];

const DURATION_OPTIONS = [
  { value: 'acute', label: 'Acute (0-2 weeks)' },
  { value: 'subacute', label: 'Sub-acute (2-6 weeks)' },
  { value: 'chronic', label: 'Chronic (6+ weeks)' },
  { value: 'recurrent', label: 'Recurrent episodes' },
];

const ONSET_OPTIONS = [
  { value: 'sudden', label: 'Sudden / Traumatic' },
  { value: 'gradual', label: 'Gradual / Insidious' },
  { value: 'unknown', label: 'Unknown / No clear trigger' },
];

const AGGRAVATING_FACTORS = [
  'Lifting', 'Bending', 'Sitting', 'Standing', 'Walking', 'Running',
  'Reaching overhead', 'Pushing', 'Pulling', 'Twisting', 'Stairs',
  'Morning stiffness', 'End of day', 'Sustained postures', 'Repetitive movements'
];

const EASING_FACTORS = [
  'Rest', 'Movement', 'Heat', 'Ice', 'Medication', 'Position change',
  'Stretching', 'Massage', 'Support/bracing', 'Lying down'
];

const PAIN_NATURE = [
  { value: 'sharp', label: 'Sharp / Stabbing' },
  { value: 'dull', label: 'Dull / Aching' },
  { value: 'burning', label: 'Burning' },
  { value: 'throbbing', label: 'Throbbing' },
  { value: 'radiating', label: 'Radiating / Shooting' },
  { value: 'stiffness', label: 'Stiffness' },
  { value: 'weakness', label: 'Weakness' },
  { value: 'numbness', label: 'Numbness / Tingling' },
];

const RED_FLAGS = [
  { value: 'night_pain', label: 'Night pain that wakes from sleep' },
  { value: 'weight_loss', label: 'Unexplained weight loss' },
  { value: 'fever', label: 'Fever / Feeling unwell' },
  { value: 'bladder_bowel', label: 'Bladder / Bowel changes' },
  { value: 'saddle_numbness', label: 'Saddle area numbness' },
  { value: 'progressive_weakness', label: 'Progressive weakness' },
  { value: 'trauma', label: 'Recent significant trauma' },
  { value: 'cancer_history', label: 'History of cancer' },
  { value: 'steroid_use', label: 'Long-term steroid use' },
  { value: 'age_under_20', label: 'Age under 20 with back pain' },
  { value: 'age_over_55', label: 'Age over 55 with new onset' },
];

export default function ClinicalIntakePanel({ onIntakeChange, className }: ClinicalIntakePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [intakeData, setIntakeData] = useState<ClinicalIntakeData>({
    painLocation: '',
    painSide: 'bilateral',
    duration: '',
    onset: '',
    aggravatingFactors: [],
    easingFactors: [],
    painNature: '',
    painSeverity: 5,
    functionalLimitations: '',
    redFlags: [],
    additionalNotes: '',
  });

  const updateIntake = (updates: Partial<ClinicalIntakeData>) => {
    const newData = { ...intakeData, ...updates };
    setIntakeData(newData);
    
    const hasData = newData.painLocation || newData.duration || 
                    newData.aggravatingFactors.length > 0 || newData.redFlags.length > 0;
    onIntakeChange(hasData ? newData : null);
  };

  const toggleArrayItem = (field: 'aggravatingFactors' | 'easingFactors' | 'redFlags', value: string) => {
    const current = intakeData[field];
    const updated = current.includes(value) 
      ? current.filter(item => item !== value)
      : [...current, value];
    updateIntake({ [field]: updated });
  };

  const clearIntake = () => {
    const emptyData: ClinicalIntakeData = {
      painLocation: '',
      painSide: 'bilateral',
      duration: '',
      onset: '',
      aggravatingFactors: [],
      easingFactors: [],
      painNature: '',
      painSeverity: 5,
      functionalLimitations: '',
      redFlags: [],
      additionalNotes: '',
    };
    setIntakeData(emptyData);
    onIntakeChange(null);
  };

  const hasRedFlags = intakeData.redFlags.length > 0;
  const completionPercentage = [
    intakeData.painLocation,
    intakeData.duration,
    intakeData.onset,
    intakeData.painNature,
    intakeData.aggravatingFactors.length > 0,
  ].filter(Boolean).length / 5 * 100;

  return (
    <Card className={className}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-slate-800/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-5 w-5 text-blue-500" />
                Clinical Intake (Optional)
                {completionPercentage > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {Math.round(completionPercentage)}% complete
                  </Badge>
                )}
                {hasRedFlags && (
                  <Badge variant="destructive" className="ml-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Red Flags
                  </Badge>
                )}
              </CardTitle>
              {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Add patient context to enhance AI analysis (skip if just capturing movement)
            </p>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pain Location</Label>
                <Select 
                  value={intakeData.painLocation} 
                  onValueChange={(value) => updateIntake({ painLocation: value })}
                >
                  <SelectTrigger data-testid="select-pain-location">
                    <SelectValue placeholder="Select body region..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BODY_REGIONS.map(region => (
                      <SelectItem key={region.value} value={region.value}>
                        {region.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Side</Label>
                <Select 
                  value={intakeData.painSide} 
                  onValueChange={(value) => updateIntake({ painSide: value as any })}
                >
                  <SelectTrigger data-testid="select-pain-side">
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

              <div className="space-y-2">
                <Label>Duration</Label>
                <Select 
                  value={intakeData.duration} 
                  onValueChange={(value) => updateIntake({ duration: value })}
                >
                  <SelectTrigger data-testid="select-duration">
                    <SelectValue placeholder="How long?" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Onset</Label>
                <Select 
                  value={intakeData.onset} 
                  onValueChange={(value) => updateIntake({ onset: value })}
                >
                  <SelectTrigger data-testid="select-onset">
                    <SelectValue placeholder="How did it start?" />
                  </SelectTrigger>
                  <SelectContent>
                    {ONSET_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pain Nature</Label>
                <Select 
                  value={intakeData.painNature} 
                  onValueChange={(value) => updateIntake({ painNature: value })}
                >
                  <SelectTrigger data-testid="select-pain-nature">
                    <SelectValue placeholder="Type of pain..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PAIN_NATURE.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pain Severity (0-10): {intakeData.painSeverity}</Label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={intakeData.painSeverity}
                  onChange={(e) => updateIntake({ painSeverity: parseInt(e.target.value) })}
                  className="w-full accent-blue-500"
                  data-testid="slider-pain-severity"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>No pain</span>
                  <span>Worst pain</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>What Makes It Worse?</Label>
              <div className="flex flex-wrap gap-2">
                {AGGRAVATING_FACTORS.map(factor => (
                  <Badge
                    key={factor}
                    variant={intakeData.aggravatingFactors.includes(factor) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-red-500/20"
                    onClick={() => toggleArrayItem('aggravatingFactors', factor)}
                    data-testid={`aggravating-${factor.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    {factor}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>What Makes It Better?</Label>
              <div className="flex flex-wrap gap-2">
                {EASING_FACTORS.map(factor => (
                  <Badge
                    key={factor}
                    variant={intakeData.easingFactors.includes(factor) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-green-500/20"
                    onClick={() => toggleArrayItem('easingFactors', factor)}
                    data-testid={`easing-${factor.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    {factor}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Red Flags (Check any that apply)
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                {RED_FLAGS.map(flag => (
                  <div key={flag.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={flag.value}
                      checked={intakeData.redFlags.includes(flag.value)}
                      onCheckedChange={() => toggleArrayItem('redFlags', flag.value)}
                      data-testid={`redflag-${flag.value}`}
                    />
                    <label htmlFor={flag.value} className="text-sm cursor-pointer">
                      {flag.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Functional Limitations</Label>
              <Textarea
                placeholder="What activities are affected? (e.g., unable to lift above shoulder, difficulty with stairs...)"
                value={intakeData.functionalLimitations}
                onChange={(e) => updateIntake({ functionalLimitations: e.target.value })}
                className="min-h-[60px]"
                data-testid="textarea-functional-limitations"
              />
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                placeholder="Any other relevant information..."
                value={intakeData.additionalNotes}
                onChange={(e) => updateIntake({ additionalNotes: e.target.value })}
                className="min-h-[60px]"
                data-testid="textarea-additional-notes"
              />
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={clearIntake} data-testid="btn-clear-intake">
                Clear All
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
