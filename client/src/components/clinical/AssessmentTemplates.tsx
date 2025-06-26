import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';

interface AssessmentTemplate {
  id: string;
  name: string;
  bodyPart: string;
  category: 'screening' | 'assessment' | 'outcome';
  description: string;
  evidenceLevel: 'A' | 'B' | 'C';
  questions: AssessmentQuestion[];
}

interface AssessmentQuestion {
  id: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'scale';
  question: string;
  options?: string[];
  min?: number;
  max?: number;
  required: boolean;
  scoring?: {
    type: 'sum' | 'weighted' | 'interpretation';
    interpretation?: { [key: string]: string };
  };
}

interface RedFlag {
  id: string;
  question: string;
  severity: 'high' | 'moderate' | 'low';
  action: string;
}

const redFlags: RedFlag[] = [
  {
    id: 'fever',
    question: 'Does the patient have a fever or signs of systemic infection?',
    severity: 'high',
    action: 'Immediate medical referral required'
  },
  {
    id: 'bowel_bladder',
    question: 'Any recent onset bowel or bladder dysfunction?',
    severity: 'high',
    action: 'Urgent medical referral - possible cauda equina'
  },
  {
    id: 'progressive_neuro',
    question: 'Progressive neurological deficit or weakness?',
    severity: 'high',
    action: 'Medical referral within 24 hours'
  },
  {
    id: 'trauma',
    question: 'History of significant trauma or fall?',
    severity: 'moderate',
    action: 'Consider imaging and medical consultation'
  },
  {
    id: 'night_pain',
    question: 'Severe night pain that wakes the patient?',
    severity: 'moderate',
    action: 'Consider serious pathology screening'
  },
  {
    id: 'weight_loss',
    question: 'Unexplained weight loss or loss of appetite?',
    severity: 'moderate',
    action: 'Medical screening recommended'
  }
];

const assessmentTemplates: AssessmentTemplate[] = [
  {
    id: 'jo_gibson_shoulder',
    name: 'Jo Gibson Shoulder Assessment',
    bodyPart: 'shoulder',
    category: 'assessment',
    description: 'Comprehensive shoulder assessment based on Jo Gibson\'s clinical approach',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'is_it_torn',
        type: 'select',
        question: 'Is it torn? (Structural integrity assessment)',
        options: ['No signs of tear', 'Possible partial tear', 'Likely full thickness tear', 'Uncertain - imaging needed'],
        required: true,
        scoring: {
          type: 'interpretation',
          interpretation: {
            'No signs of tear': 'Structural integrity appears intact',
            'Possible partial tear': 'Consider imaging and modified loading',
            'Likely full thickness tear': 'Imaging recommended, potential surgical consultation',
            'Uncertain - imaging needed': 'Further investigation required'
          }
        }
      },
      {
        id: 'is_it_stiff',
        type: 'select',
        question: 'Is it stiff? (Range of motion assessment)',
        options: ['Normal ROM', 'Mildly restricted', 'Moderately restricted', 'Severely restricted'],
        required: true,
        scoring: {
          type: 'interpretation',
          interpretation: {
            'Normal ROM': 'No mobility restrictions identified',
            'Mildly restricted': 'Light mobilization and stretching indicated',
            'Moderately restricted': 'Progressive mobilization program needed',
            'Severely restricted': 'Intensive mobilization, consider capsular pattern'
          }
        }
      },
      {
        id: 'is_it_irritable',
        type: 'select',
        question: 'Is it irritable? (Pain and inflammation level)',
        options: ['Not irritable', 'Mildly irritable', 'Moderately irritable', 'Highly irritable'],
        required: true,
        scoring: {
          type: 'interpretation',
          interpretation: {
            'Not irritable': 'Can progress with normal loading',
            'Mildly irritable': 'Gentle progression with monitoring',
            'Moderately irritable': 'Conservative approach, pain-free range',
            'Highly irritable': 'Rest, gentle range of motion only'
          }
        }
      },
      {
        id: 'can_you_change_it',
        type: 'select',
        question: 'Can you change it? (Modifiability assessment)',
        options: ['Highly modifiable', 'Moderately modifiable', 'Minimally modifiable', 'Not modifiable'],
        required: true,
        scoring: {
          type: 'interpretation',
          interpretation: {
            'Highly modifiable': 'Excellent prognosis for conservative treatment',
            'Moderately modifiable': 'Good response expected with appropriate intervention',
            'Minimally modifiable': 'Slower progress, persistent approach needed',
            'Not modifiable': 'Consider alternative treatments or referral'
          }
        }
      },
      {
        id: 'movement_pattern',
        type: 'select',
        question: 'Movement pattern quality',
        options: ['Normal scapulohumeral rhythm', 'Mild dysfunction', 'Moderate dysfunction', 'Severe dysfunction'],
        required: true
      },
      {
        id: 'strength_deficit',
        type: 'select',
        question: 'Strength deficit present?',
        options: ['No deficit', 'Mild weakness', 'Moderate weakness', 'Significant weakness'],
        required: true
      },
      {
        id: 'functional_impact',
        type: 'select',
        question: 'Functional impact on daily activities',
        options: ['No impact', 'Mild impact', 'Moderate impact', 'Severe impact'],
        required: true
      },
      {
        id: 'pain_behavior',
        type: 'select',
        question: 'Pain behavior pattern',
        options: ['Mechanical pain', 'Inflammatory pain', 'Mixed pattern', 'Non-mechanical pain'],
        required: true
      },
      {
        id: 'response_to_loading',
        type: 'select',
        question: 'Response to loading/exercise',
        options: ['Improves with loading', 'No change with loading', 'Worsens with loading', 'Variable response'],
        required: true
      },
      {
        id: 'sleep_disturbance',
        type: 'select',
        question: 'Sleep disturbance due to shoulder pain',
        options: ['No sleep issues', 'Occasional disturbance', 'Frequent disturbance', 'Severe sleep disruption'],
        required: true
      }
    ]
  },
  {
    id: 'alison_grimaldi_hip',
    name: 'Alison Grimaldi Hip Assessment',
    bodyPart: 'hip',
    category: 'assessment',
    description: 'Comprehensive hip assessment based on Alison Grimaldi\'s approach to gluteal tendinopathy and lateral hip pain',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'lateral_hip_pain_location',
        type: 'select',
        question: 'Primary pain location',
        options: ['Greater trochanter', 'Lateral thigh', 'Buttock', 'Groin', 'Multiple locations'],
        required: true,
        scoring: {
          type: 'interpretation',
          interpretation: {
            'Greater trochanter': 'Typical gluteal tendinopathy presentation',
            'Lateral thigh': 'Consider ITB syndrome or referred pain',
            'Buttock': 'Deep gluteal syndrome possible',
            'Groin': 'Anterior hip pathology likely',
            'Multiple locations': 'Complex presentation - multiple structures involved'
          }
        }
      },
      {
        id: 'gluteal_strength_test',
        type: 'select',
        question: 'Gluteal strength assessment (side-lying abduction)',
        options: ['Normal strength', 'Mild weakness', 'Moderate weakness', 'Severe weakness'],
        required: true,
        scoring: {
          type: 'interpretation',
          interpretation: {
            'Normal strength': 'Strength not primary issue',
            'Mild weakness': 'Progressive strengthening indicated',
            'Moderate weakness': 'Focused gluteal rehabilitation needed',
            'Severe weakness': 'Intensive strengthening program required'
          }
        }
      },
      {
        id: 'single_leg_stance',
        type: 'select',
        question: 'Single leg stance test (30 seconds)',
        options: ['Normal control', 'Mild Trendelenburg', 'Moderate Trendelenburg', 'Severe Trendelenburg'],
        required: true,
        scoring: {
          type: 'interpretation',
          interpretation: {
            'Normal control': 'Good functional strength',
            'Mild Trendelenburg': 'Motor control training needed',
            'Moderate Trendelenburg': 'Strength and control deficits',
            'Severe Trendelenburg': 'Significant gluteal dysfunction'
          }
        }
      },
      {
        id: 'step_down_test',
        type: 'select',
        question: 'Single leg step down test quality',
        options: ['Good control', 'Mild dysfunction', 'Moderate dysfunction', 'Poor control'],
        required: true,
        scoring: {
          type: 'interpretation',
          interpretation: {
            'Good control': 'Functional movement intact',
            'Mild dysfunction': 'Minor movement compensations',
            'Moderate dysfunction': 'Significant movement faults',
            'Poor control': 'Major functional deficits'
          }
        }
      },
      {
        id: 'aggravating_activities',
        type: 'select',
        question: 'Primary aggravating activities',
        options: ['Walking', 'Stairs', 'Side lying', 'Sitting', 'Running/sports'],
        required: true,
        scoring: {
          type: 'interpretation',
          interpretation: {
            'Walking': 'Load-related tendinopathy likely',
            'Stairs': 'Eccentric loading sensitivity',
            'Side lying': 'Compression sensitivity',
            'Sitting': 'Possible posterior hip involvement',
            'Running/sports': 'High-level functional deficits'
          }
        }
      },
      {
        id: 'tendon_loading_response',
        type: 'select',
        question: 'Response to tendon loading',
        options: ['Improves with loading', 'No change', 'Worsens immediately', 'Delayed onset soreness'],
        required: true,
        scoring: {
          type: 'interpretation',
          interpretation: {
            'Improves with loading': 'Reactive tendinopathy - good prognosis',
            'No change': 'Degenerative changes possible',
            'Worsens immediately': 'Reactive/inflammatory phase',
            'Delayed onset soreness': 'Typical tendinopathy response'
          }
        }
      },
      {
        id: 'hip_flexor_length',
        type: 'select',
        question: 'Hip flexor length assessment (Thomas test)',
        options: ['Normal length', 'Mild tightness', 'Moderate tightness', 'Severe restriction'],
        required: true,
        scoring: {
          type: 'interpretation',
          interpretation: {
            'Normal length': 'Anterior structures not restricted',
            'Mild tightness': 'Light stretching indicated',
            'Moderate tightness': 'Stretching program needed',
            'Severe restriction': 'Intensive mobility work required'
          }
        }
      },
      {
        id: 'itb_tightness',
        type: 'select',
        question: 'ITB/TFL tightness (Ober test)',
        options: ['Normal', 'Mild tightness', 'Moderate tightness', 'Severe tightness'],
        required: true,
        scoring: {
          type: 'interpretation',
          interpretation: {
            'Normal': 'ITB not contributing factor',
            'Mild tightness': 'Minor mobility work needed',
            'Moderate tightness': 'ITB stretching important',
            'Severe tightness': 'Major contributor to dysfunction'
          }
        }
      },
      {
        id: 'pain_behavior_pattern',
        type: 'select',
        question: 'Pain behavior pattern',
        options: ['Mechanical', 'Inflammatory', 'Neuropathic', 'Mixed pattern'],
        required: true,
        scoring: {
          type: 'interpretation',
          interpretation: {
            'Mechanical': 'Load management approach',
            'Inflammatory': 'Anti-inflammatory strategies',
            'Neuropathic': 'Neural mobilization techniques',
            'Mixed pattern': 'Multimodal approach needed'
          }
        }
      },
      {
        id: 'functional_impact_level',
        type: 'select',
        question: 'Functional impact on daily activities',
        options: ['Minimal impact', 'Mild limitation', 'Moderate limitation', 'Severe limitation'],
        required: true,
        scoring: {
          type: 'interpretation',
          interpretation: {
            'Minimal impact': 'Early intervention effective',
            'Mild limitation': 'Activity modification needed',
            'Moderate limitation': 'Comprehensive rehabilitation required',
            'Severe limitation': 'Intensive treatment approach'
          }
        }
      }
    ]
  },
  {
    id: 'mckenzie_lower_back',
    name: 'McKenzie Lower Back Pain Assessment',
    bodyPart: 'back',
    category: 'assessment',
    description: 'Comprehensive lower back assessment based on McKenzie approach to spinal pain and dysfunction',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'pain_location',
        type: 'select',
        question: 'Primary pain location',
        options: ['Central lower back', 'Unilateral lower back', 'Bilateral lower back', 'Radiating to leg', 'Multiple areas'],
        required: true,
        scoring: {
          type: 'interpretation',
          interpretation: {
            'Central lower back': 'Central syndrome likely - good prognosis',
            'Unilateral lower back': 'Possible lateral shift or facet involvement',
            'Bilateral lower back': 'Consider postural or degenerative factors',
            'Radiating to leg': 'Possible disc involvement or nerve root compression',
            'Multiple areas': 'Complex presentation requiring detailed assessment'
          }
        }
      },
      {
        id: 'pain_behavior',
        type: 'select',
        question: 'Pain behavior with movement',
        options: ['Better with movement', 'Worse with movement', 'No change with movement', 'Variable response'],
        required: true,
        scoring: {
          type: 'interpretation',
          interpretation: {
            'Better with movement': 'Derangement syndrome likely',
            'Worse with movement': 'Dysfunction or inflammatory component',
            'No change with movement': 'Consider other causes or chronic pain',
            'Variable response': 'Mixed syndrome or complex presentation'
          }
        }
      },
      {
        id: 'flexion_response',
        type: 'select',
        question: 'Response to repeated forward bending',
        options: ['Pain centralizes', 'Pain peripheralizes', 'No change', 'Increases centrally'],
        required: true,
        scoring: {
          type: 'interpretation',
          interpretation: {
            'Pain centralizes': 'Excellent prognostic sign - continue extension',
            'Pain peripheralizes': 'Avoid flexion - poor prognostic sign',
            'No change': 'Flexion not primary movement direction',
            'Increases centrally': 'Some flexion sensitivity but centralization occurring'
          }
        }
      },
      {
        id: 'extension_response',
        type: 'select',
        question: 'Response to repeated backward bending',
        options: ['Pain centralizes', 'Pain peripheralizes', 'No change', 'Increases centrally'],
        required: true,
        scoring: {
          type: 'interpretation',
          interpretation: {
            'Pain centralizes': 'Extension is the direction of preference',
            'Pain peripheralizes': 'Avoid extension exercises',
            'No change': 'Extension not primary movement direction',
            'Increases centrally': 'Some extension sensitivity'
          }
        }
      },
      {
        id: 'lateral_shift',
        type: 'select',
        question: 'Visible lateral shift present?',
        options: ['No shift', 'Slight shift', 'Moderate shift', 'Marked shift'],
        required: true,
        scoring: {
          type: 'interpretation',
          interpretation: {
            'No shift': 'No lateral component to address',
            'Slight shift': 'Minor lateral correction may be needed',
            'Moderate shift': 'Lateral shift correction indicated',
            'Marked shift': 'Primary focus on lateral shift correction'
          }
        }
      },
      {
        id: 'sitting_tolerance',
        type: 'select',
        question: 'Sitting tolerance',
        options: ['Normal tolerance', 'Mild discomfort', 'Moderate discomfort', 'Cannot sit'],
        required: true,
        scoring: {
          type: 'interpretation',
          interpretation: {
            'Normal tolerance': 'Sitting not a primary aggravator',
            'Mild discomfort': 'Some postural education needed',
            'Moderate discomfort': 'Significant sitting intolerance - disc involvement likely',
            'Cannot sit': 'Severe disc derangement possible'
          }
        }
      },
      {
        id: 'morning_stiffness',
        type: 'select',
        question: 'Morning stiffness duration',
        options: ['No stiffness', 'Less than 30 minutes', '30-60 minutes', 'More than 60 minutes'],
        required: true,
        scoring: {
          type: 'interpretation',
          interpretation: {
            'No stiffness': 'No significant inflammatory component',
            'Less than 30 minutes': 'Normal response to rest',
            '30-60 minutes': 'Some disc or joint stiffness',
            'More than 60 minutes': 'Significant inflammatory component'
          }
        }
      },
      {
        id: 'centralization_phenomenon',
        type: 'select',
        question: 'Can symptoms be centralized with movement?',
        options: ['Yes, easily', 'Yes, with effort', 'Partially', 'No centralization'],
        required: true,
        scoring: {
          type: 'interpretation',
          interpretation: {
            'Yes, easily': 'Excellent prognosis - rapid recovery expected',
            'Yes, with effort': 'Good prognosis with appropriate treatment',
            'Partially': 'Moderate prognosis - consistent approach needed',
            'No centralization': 'Guarded prognosis - may need alternative approach'
          }
        }
      },
      {
        id: 'functional_impact',
        type: 'select',
        question: 'Impact on daily function',
        options: ['Minimal impact', 'Mild limitation', 'Moderate limitation', 'Severe limitation'],
        required: true,
        scoring: {
          type: 'interpretation',
          interpretation: {
            'Minimal impact': 'Early intervention can prevent progression',
            'Mild limitation': 'Good response to McKenzie approach expected',
            'Moderate limitation': 'Consistent treatment approach required',
            'Severe limitation': 'Intensive treatment and education needed'
          }
        }
      },
      {
        id: 'previous_episodes',
        type: 'select',
        question: 'History of previous episodes',
        options: ['First episode', 'Occasional episodes', 'Frequent episodes', 'Chronic ongoing'],
        required: true,
        scoring: {
          type: 'interpretation',
          interpretation: {
            'First episode': 'Excellent recovery potential with education',
            'Occasional episodes': 'Prevention strategies important',
            'Frequent episodes': 'Underlying movement dysfunction likely',
            'Chronic ongoing': 'Comprehensive approach including lifestyle factors'
          }
        }
      }
    ]
  },
  {
    id: 'dash',
    name: 'DASH - Disabilities of Arm, Shoulder and Hand',
    bodyPart: 'upper_extremity',
    category: 'outcome',
    description: 'Validated outcome measure for upper extremity dysfunction',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'q1',
        type: 'select',
        question: 'Open a tight or new jar',
        options: ['No difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty', 'Unable'],
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'q2',
        type: 'select',
        question: 'Write',
        options: ['No difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty', 'Unable'],
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'q3',
        type: 'select',
        question: 'Turn a key',
        options: ['No difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty', 'Unable'],
        required: true,
        scoring: { type: 'sum' }
      }
    ]
  },
  {
    id: 'shoulder_impingement',
    name: 'Shoulder Impingement Assessment',
    bodyPart: 'shoulder',
    category: 'assessment',
    description: 'Clinical tests for shoulder impingement syndrome',
    evidenceLevel: 'B',
    questions: [
      {
        id: 'hawkins_test',
        type: 'select',
        question: 'Hawkins-Kennedy Test',
        options: ['Negative', 'Positive', 'Unable to perform'],
        required: true
      },
      {
        id: 'neers_test',
        type: 'select',
        question: "Neer's Impingement Sign",
        options: ['Negative', 'Positive', 'Unable to perform'],
        required: true
      },
      {
        id: 'empty_can',
        type: 'select',
        question: 'Empty Can Test (Supraspinatus)',
        options: ['Negative', 'Positive', 'Unable to perform'],
        required: true
      },
      {
        id: 'painful_arc',
        type: 'select',
        question: 'Painful Arc (60-120 degrees)',
        options: ['Absent', 'Present', 'Unable to assess'],
        required: true
      }
    ]
  },
  {
    id: 'cervical_screening',
    name: 'Cervical Spine Screening',
    bodyPart: 'neck',
    category: 'screening',
    description: 'Screening for cervical spine pathology and red flags',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'ccr_age',
        type: 'number',
        question: 'Patient age',
        required: true
      },
      {
        id: 'ccr_mechanism',
        type: 'select',
        question: 'Mechanism of injury',
        options: ['High-speed MVA', 'Fall from height', 'Diving injury', 'Other trauma', 'Non-traumatic'],
        required: true
      },
      {
        id: 'ccr_neuro',
        type: 'checkbox',
        question: 'Neurological symptoms present',
        required: true
      }
    ]
  },
  {
    id: 'low_back_stm',
    name: 'STarT Back Screening Tool',
    bodyPart: 'back',
    category: 'screening',
    description: 'Stratifies low back pain patients for treatment approaches',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'stm_q1',
        type: 'checkbox',
        question: 'My back pain has spread down my leg(s) at some time in the last 2 weeks',
        required: true
      },
      {
        id: 'stm_q2',
        type: 'checkbox',
        question: 'I have had pain in the shoulder or neck at some time in the last 2 weeks',
        required: true
      },
      {
        id: 'stm_q3',
        type: 'checkbox',
        question: 'I have only walked short distances because of my back pain',
        required: true
      },
      {
        id: 'stm_q4',
        type: 'checkbox',
        question: 'In the last 2 weeks, I have dressed more slowly than usual because of back pain',
        required: true
      }
    ]
  },
  {
    id: 'bisset_elbow',
    name: 'Leanne Bisset Elbow Assessment',
    bodyPart: 'elbow',
    category: 'assessment',
    description: 'Comprehensive elbow assessment based on Leanne Bisset\'s evidence-based approach for lateral elbow tendinopathy',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'elbow_pain_location',
        type: 'select',
        question: 'Primary location of elbow pain',
        options: ['Lateral epicondyle', 'Medial epicondyle', 'Olecranon', 'Anterior elbow', 'Diffuse'],
        required: true
      },
      {
        id: 'elbow_pain_onset',
        type: 'select',
        question: 'Onset of elbow symptoms',
        options: ['Gradual over weeks', 'Gradual over months', 'Sudden onset', 'Post-injury'],
        required: true
      },
      {
        id: 'elbow_aggravating_factors',
        type: 'select',
        question: 'Primary aggravating factors',
        options: ['Gripping activities', 'Lifting objects', 'Computer/desk work', 'Sports activities', 'All activities'],
        required: true
      },
      {
        id: 'elbow_pain_intensity',
        type: 'scale',
        question: 'Current pain intensity (0-10 scale)',
        min: 0,
        max: 10,
        required: true
      },
      {
        id: 'elbow_functional_impact',
        type: 'select',
        question: 'Functional impact on daily activities',
        options: ['Mild - minimal impact', 'Moderate - some limitation', 'Severe - significant limitation', 'Unable to perform activities'],
        required: true
      },
      {
        id: 'lateral_epicondyle_palpation',
        type: 'select',
        question: 'Lateral epicondyle palpation findings',
        options: ['Non-tender', 'Mildly tender', 'Moderately tender', 'Severely tender'],
        required: true
      },
      {
        id: 'wrist_extension_strength',
        type: 'select',
        question: 'Resisted wrist extension strength',
        options: ['Full strength', 'Slightly weak', 'Moderately weak', 'Severely weak', 'Unable to test'],
        required: true
      },
      {
        id: 'grip_strength_pain',
        type: 'checkbox',
        question: 'Pain with grip strength testing',
        required: true
      },
      {
        id: 'mills_test',
        type: 'select',
        question: 'Mills Test (passive wrist flexion with elbow extension)',
        options: ['Negative', 'Positive - reproduces symptoms', 'Unable to perform'],
        required: true
      },
      {
        id: 'elbow_rom',
        type: 'select',
        question: 'Elbow range of motion',
        options: ['Full ROM', 'Slightly limited', 'Moderately limited', 'Severely limited'],
        required: true
      }
    ]
  },
  {
    id: 'robertson_knee',
    name: 'Claire Patella Robertson Knee Pain Assessment',
    bodyPart: 'knee',
    category: 'assessment',
    description: 'Specialized knee pain assessment based on Claire Patella Robertson\'s clinical expertise in patellofemoral disorders',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'knee_pain_location',
        type: 'select',
        question: 'Primary location of knee pain',
        options: ['Anterior knee/patella', 'Medial knee', 'Lateral knee', 'Posterior knee', 'Diffuse knee pain'],
        required: true
      },
      {
        id: 'knee_pain_onset',
        type: 'select',
        question: 'Onset of knee symptoms',
        options: ['Gradual onset', 'Sudden onset after activity', 'Post-traumatic', 'Insidious onset'],
        required: true
      },
      {
        id: 'knee_aggravating_activities',
        type: 'select',
        question: 'Activities that worsen knee pain',
        options: ['Stairs (up/down)', 'Squatting/kneeling', 'Prolonged sitting', 'Running/jumping', 'All weight-bearing'],
        required: true
      },
      {
        id: 'knee_pain_intensity',
        type: 'scale',
        question: 'Current knee pain intensity (0-10 scale)',
        min: 0,
        max: 10,
        required: true
      },
      {
        id: 'patella_tracking',
        type: 'select',
        question: 'Patella tracking during active knee extension',
        options: ['Normal tracking', 'Lateral tracking', 'Medial tracking', 'Irregular tracking', 'Unable to assess'],
        required: true
      },
      {
        id: 'patella_apprehension',
        type: 'select',
        question: 'Patella apprehension test',
        options: ['Negative', 'Positive - apprehension only', 'Positive - pain and apprehension', 'Unable to perform'],
        required: true
      },
      {
        id: 'patella_compression',
        type: 'select',
        question: 'Patella compression test (Clarke\'s test)',
        options: ['Negative', 'Positive - pain only', 'Positive - unable to hold contraction', 'Unable to perform'],
        required: true
      },
      {
        id: 'knee_quadriceps_strength',
        type: 'select',
        question: 'Quadriceps strength assessment',
        options: ['Full strength', 'Slightly weak', 'Moderately weak', 'Severely weak', 'Unable to test'],
        required: true
      },
      {
        id: 'knee_swelling',
        type: 'select',
        question: 'Knee swelling/effusion',
        options: ['None visible', 'Mild swelling', 'Moderate swelling', 'Severe swelling'],
        required: true
      },
      {
        id: 'knee_rom',
        type: 'select',
        question: 'Knee range of motion',
        options: ['Full ROM', 'Slightly limited', 'Moderately limited', 'Severely limited'],
        required: true
      }
    ]
  },
  {
    id: 'mayer_ankle',
    name: 'Sue Mayer Ankle Pain Assessment',
    bodyPart: 'ankle',
    category: 'assessment',
    description: 'Comprehensive ankle assessment based on Sue Mayer\'s clinical approach to ankle and foot disorders',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'ankle_pain_location',
        type: 'select',
        question: 'Primary location of ankle pain',
        options: ['Lateral ankle', 'Medial ankle', 'Anterior ankle', 'Posterior ankle', 'Achilles region'],
        required: true
      },
      {
        id: 'ankle_pain_onset',
        type: 'select',
        question: 'Onset of ankle symptoms',
        options: ['Acute injury/sprain', 'Gradual onset', 'Overuse related', 'Post-surgery complications'],
        required: true
      },
      {
        id: 'ankle_mechanism_injury',
        type: 'select',
        question: 'Mechanism of injury (if applicable)',
        options: ['Inversion sprain', 'Eversion sprain', 'Achilles strain', 'Direct impact', 'No specific injury'],
        required: true
      },
      {
        id: 'ankle_pain_intensity',
        type: 'scale',
        question: 'Current ankle pain intensity (0-10 scale)',
        min: 0,
        max: 10,
        required: true
      },
      {
        id: 'ankle_weight_bearing',
        type: 'select',
        question: 'Weight-bearing ability',
        options: ['Full weight-bearing', 'Partial weight-bearing', 'Non-weight-bearing', 'Weight-bearing with aid'],
        required: true
      },
      {
        id: 'ankle_swelling',
        type: 'select',
        question: 'Ankle swelling/edema',
        options: ['None', 'Mild localized', 'Moderate generalized', 'Severe'],
        required: true
      },
      {
        id: 'ankle_stability',
        type: 'select',
        question: 'Ankle stability (anterior drawer test)',
        options: ['Stable/negative', 'Mild laxity', 'Moderate instability', 'Severe instability', 'Unable to test'],
        required: true
      },
      {
        id: 'ankle_dorsiflexion_rom',
        type: 'select',
        question: 'Ankle dorsiflexion range of motion',
        options: ['Normal (>10 degrees)', 'Slightly limited (5-10 degrees)', 'Moderately limited (0-5 degrees)', 'Severely limited (<0 degrees)'],
        required: true
      },
      {
        id: 'ankle_plantarflexion_strength',
        type: 'select',
        question: 'Plantarflexion strength (calf raise ability)',
        options: ['Normal strength', 'Slightly weak', 'Moderately weak', 'Unable to perform single calf raise'],
        required: true
      },
      {
        id: 'ankle_functional_impact',
        type: 'select',
        question: 'Functional impact on activities',
        options: ['Minimal impact', 'Difficulty with stairs', 'Difficulty with walking', 'Unable to perform normal activities'],
        required: true
      }
    ]
  },
  {
    id: 'running_injury_assessment',
    name: 'Running Injury Assessment Protocol',
    bodyPart: 'Lower Extremity',
    category: 'assessment',
    description: 'Comprehensive running injury assessment based on evidence-based protocols for injury prevention and management',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'running_experience',
        type: 'select',
        question: 'How long have you been running regularly?',
        options: ['Less than 6 months', '6 months - 1 year', '1-3 years', '3-5 years', 'Over 5 years'],
        required: true
      },
      {
        id: 'weekly_mileage',
        type: 'select',
        question: 'What is your average weekly mileage?',
        options: ['Less than 10 miles', '10-20 miles', '21-30 miles', '31-50 miles', 'Over 50 miles'],
        required: true
      },
      {
        id: 'injury_location',
        type: 'select',
        question: 'Where is your primary pain/injury located?',
        options: ['Knee', 'Shin/Tibia', 'Achilles tendon', 'Plantar fascia/Heel', 'Hip/Glute', 'IT Band', 'Calf', 'Ankle', 'Other'],
        required: true
      },
      {
        id: 'pain_onset',
        type: 'select',
        question: 'When did the pain first appear?',
        options: ['During running', 'After running', 'The next day', 'Gradual onset over weeks', 'Sudden onset'],
        required: true
      },
      {
        id: 'pain_intensity',
        type: 'scale',
        question: 'Rate your pain intensity during running (0 = no pain, 10 = worst pain)',
        min: 0,
        max: 10,
        required: true
      },
      {
        id: 'training_changes',
        type: 'select',
        question: 'Have you recently made changes to your training?',
        options: ['Increased mileage suddenly', 'Increased speed/intensity', 'Changed running surface', 'New shoes', 'No recent changes'],
        required: true
      },
      {
        id: 'running_surface',
        type: 'select',
        question: 'What surface do you primarily run on?',
        options: ['Concrete/Pavement', 'Asphalt road', 'Treadmill', 'Trail/Dirt', 'Track', 'Mixed surfaces'],
        required: true
      },
      {
        id: 'shoe_age',
        type: 'select',
        question: 'How old are your current running shoes?',
        options: ['Less than 3 months', '3-6 months', '6-12 months', 'Over 1 year', 'Not sure'],
        required: true
      },
      {
        id: 'previous_injuries',
        type: 'checkbox',
        question: 'Have you had previous running injuries?',
        required: false
      },
      {
        id: 'warmup_routine',
        type: 'select',
        question: 'Do you perform a warm-up before running?',
        options: ['Always', 'Usually', 'Sometimes', 'Rarely', 'Never'],
        required: true
      },
      {
        id: 'strength_training',
        type: 'select',
        question: 'How often do you do strength training?',
        options: ['3+ times per week', '2 times per week', '1 time per week', 'Occasionally', 'Never'],
        required: true
      },
      {
        id: 'hip_drop_test',
        type: 'select',
        question: 'Single leg stance test (30 seconds) - Hip stability',
        options: ['Stable - no hip drop', 'Slight hip drop', 'Moderate hip drop', 'Significant instability', 'Cannot perform'],
        required: true
      },
      {
        id: 'calf_raise_test',
        type: 'select',
        question: 'Single leg calf raise test (10 repetitions)',
        options: ['Completed easily', 'Completed with difficulty', 'Completed 5-9 reps', 'Completed less than 5', 'Cannot perform'],
        required: true
      },
      {
        id: 'hop_test',
        type: 'select',
        question: 'Single leg hop test - Pain or difficulty?',
        options: ['No pain or difficulty', 'Mild discomfort', 'Moderate pain', 'Significant pain', 'Cannot perform'],
        required: true
      },
      {
        id: 'running_form',
        type: 'select',
        question: 'How would you describe your running gait?',
        options: ['Heel striker', 'Midfoot striker', 'Forefoot striker', 'Not sure', 'Varies'],
        required: true
      }
    ]
  },
  {
    id: 'laslett_back_sij',
    name: 'Mark Laslett Back and SIJ Pain Assessment',
    bodyPart: 'Lower Back/Pelvis',
    category: 'assessment',
    description: 'Evidence-based assessment protocol for differentiating lumbar spine and sacroiliac joint pain based on Mark Laslett\'s research',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'pain_location',
        type: 'select',
        question: 'Primary pain location',
        options: ['Central lower back', 'Unilateral lower back', 'Buttock/posterior pelvis', 'Groin/anterior pelvis', 'Leg pain below knee'],
        required: true
      },
      {
        id: 'sij_distraction_test',
        type: 'select',
        question: 'SIJ Distraction Test',
        options: ['Negative', 'Positive - reproduces familiar pain', 'Positive - different pain', 'Unable to perform'],
        required: true
      },
      {
        id: 'sij_compression_test',
        type: 'select',
        question: 'SIJ Compression Test',
        options: ['Negative', 'Positive - reproduces familiar pain', 'Positive - different pain', 'Unable to perform'],
        required: true
      },
      {
        id: 'posterior_shear_test',
        type: 'select',
        question: 'Posterior Shear Test (Thigh Thrust)',
        options: ['Negative', 'Positive - reproduces familiar pain', 'Positive - different pain', 'Unable to perform'],
        required: true
      },
      {
        id: 'sacral_thrust_test',
        type: 'select',
        question: 'Sacral Thrust Test',
        options: ['Negative', 'Positive - reproduces familiar pain', 'Positive - different pain', 'Unable to perform'],
        required: true
      },
      {
        id: 'gaenslen_test',
        type: 'select',
        question: 'Gaenslen Test',
        options: ['Negative', 'Positive - reproduces familiar pain', 'Positive - different pain', 'Unable to perform'],
        required: true
      },
      {
        id: 'patrick_test',
        type: 'select',
        question: 'Patrick Test (FABER)',
        options: ['Negative', 'Positive - reproduces familiar pain', 'Positive - different pain', 'Unable to perform'],
        required: true
      },
      {
        id: 'centralization_phenomenon',
        type: 'select',
        question: 'Centralization phenomenon with repeated movements',
        options: ['Yes - centralizes easily', 'Partial centralization', 'No centralization', 'Peripheralizes'],
        required: true
      },
      {
        id: 'sitting_tolerance',
        type: 'select',
        question: 'Sitting tolerance',
        options: ['Normal tolerance', 'Mild discomfort', 'Moderate discomfort', 'Cannot sit >30 minutes', 'Cannot sit'],
        required: true
      },
      {
        id: 'morning_stiffness',
        type: 'select',
        question: 'Morning stiffness duration',
        options: ['No stiffness', '<30 minutes', '30-60 minutes', '>60 minutes', 'All day'],
        required: true
      },
      {
        id: 'age_related_factors',
        type: 'select',
        question: 'Age and onset factors',
        options: ['Young adult - sudden onset', 'Middle aged - gradual onset', 'Older adult - degenerative', 'Post-pregnancy onset', 'Post-trauma onset'],
        required: true
      }
    ]
  },
  {
    id: 'hand_injury_assessment',
    name: 'Evidence-Based Hand Injury Assessment',
    bodyPart: 'Hand/Wrist',
    category: 'assessment',
    description: 'Comprehensive hand injury assessment based on current evidence and clinical guidelines',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'injury_mechanism',
        type: 'select',
        question: 'Mechanism of injury',
        options: ['Fall on outstretched hand', 'Direct blow/crush', 'Twisting/rotation', 'Repetitive stress', 'Cut/laceration', 'No specific trauma'],
        required: true
      },
      {
        id: 'pain_location_hand',
        type: 'select',
        question: 'Primary pain location',
        options: ['Thumb base/CMC joint', 'Wrist - radial side', 'Wrist - ulnar side', 'Palm/thenar', 'Fingers', 'Dorsal hand'],
        required: true
      },
      {
        id: 'swelling_deformity',
        type: 'select',
        question: 'Swelling or visible deformity',
        options: ['None visible', 'Mild localized swelling', 'Moderate generalized swelling', 'Visible deformity', 'Severe swelling/deformity'],
        required: true
      },
      {
        id: 'grip_strength_loss',
        type: 'select',
        question: 'Grip strength compared to unaffected side',
        options: ['Normal strength', 'Slightly reduced', 'Moderately reduced', 'Severely reduced', 'Unable to grip'],
        required: true
      },
      {
        id: 'thumb_opposition',
        type: 'select',
        question: 'Thumb opposition to little finger',
        options: ['Full opposition', 'Slight limitation', 'Moderate limitation', 'Severe limitation', 'Cannot oppose'],
        required: true
      },
      {
        id: 'finger_flexion',
        type: 'select',
        question: 'Finger flexion (make a fist)',
        options: ['Complete fist', 'Nearly complete', 'Moderate limitation', 'Severe limitation', 'Cannot make fist'],
        required: true
      },
      {
        id: 'wrist_extension',
        type: 'select',
        question: 'Wrist extension range',
        options: ['Normal (>60 degrees)', 'Mildly limited (45-60 degrees)', 'Moderately limited (30-45 degrees)', 'Severely limited (<30 degrees)', 'Unable to extend'],
        required: true
      },
      {
        id: 'finkelstein_test',
        type: 'select',
        question: 'Finkelstein Test (thumb tendon)',
        options: ['Negative', 'Positive - sharp pain', 'Positive - mild discomfort', 'Unable to perform'],
        required: true
      },
      {
        id: 'carpal_tunnel_signs',
        type: 'select',
        question: 'Carpal tunnel signs (numbness/tingling)',
        options: ['No symptoms', 'Thumb/index finger', 'Thumb/index/middle finger', 'All fingers except little', 'Nighttime symptoms'],
        required: true
      },
      {
        id: 'functional_impact_hand',
        type: 'select',
        question: 'Functional impact on daily activities',
        options: ['No impact', 'Difficulty with fine tasks', 'Difficulty with grip tasks', 'Unable to use hand normally', 'Complete dysfunction'],
        required: true
      }
    ]
  },
  {
    id: 'foot_injury_assessment',
    name: 'Evidence-Based Foot Injury Assessment',
    bodyPart: 'Foot',
    category: 'assessment',
    description: 'Comprehensive foot injury assessment based on current evidence and clinical practice guidelines',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'foot_injury_mechanism',
        type: 'select',
        question: 'Mechanism of injury',
        options: ['Inversion ankle sprain', 'Direct impact/crush', 'Overuse/repetitive stress', 'Jump/landing injury', 'Hyperextension', 'No specific trauma'],
        required: true
      },
      {
        id: 'foot_pain_location',
        type: 'select',
        question: 'Primary pain location',
        options: ['Heel/plantar fascia', 'Achilles tendon', 'Midfoot/arch', 'Forefoot/metatarsals', 'Big toe/1st MTP', 'Lateral foot border'],
        required: true
      },
      {
        id: 'weight_bearing_ability',
        type: 'select',
        question: 'Weight-bearing ability',
        options: ['Full weight-bearing', 'Partial weight-bearing', 'Toe-touch only', 'Non-weight-bearing', 'Unable to stand'],
        required: true
      },
      {
        id: 'foot_swelling',
        type: 'select',
        question: 'Foot swelling/edema',
        options: ['None visible', 'Mild localized', 'Moderate generalized', 'Severe with deformity', 'Unable to assess'],
        required: true
      },
      {
        id: 'plantar_fascia_stretch',
        type: 'select',
        question: 'Plantar fascia stretch test (toe extension)',
        options: ['Negative', 'Positive - heel pain', 'Positive - arch pain', 'Unable to perform'],
        required: true
      },
      {
        id: 'achilles_squeeze_test',
        type: 'select',
        question: 'Achilles squeeze test (Thompson test)',
        options: ['Normal plantarflexion', 'Reduced plantarflexion', 'No plantarflexion', 'Unable to perform'],
        required: true
      },
      {
        id: 'great_toe_extension',
        type: 'select',
        question: 'Great toe extension (1st MTP dorsiflexion)',
        options: ['Normal (>60 degrees)', 'Mildly limited (45-60 degrees)', 'Moderately limited (30-45 degrees)', 'Severely limited (<30 degrees)', 'Unable to move'],
        required: true
      },
      {
        id: 'navicular_drop_test',
        type: 'select',
        question: 'Navicular drop test (arch support)',
        options: ['Normal (<10mm drop)', 'Mild drop (10-15mm)', 'Moderate drop (15-20mm)', 'Excessive drop (>20mm)', 'Unable to assess'],
        required: true
      },
      {
        id: 'foot_sensation',
        type: 'select',
        question: 'Foot sensation/numbness',
        options: ['Normal sensation', 'Numbness in toes', 'Numbness in forefoot', 'Numbness in heel', 'Complete loss of sensation'],
        required: true
      },
      {
        id: 'walking_ability',
        type: 'select',
        question: 'Walking ability',
        options: ['Normal gait', 'Slight limp', 'Significant limp', 'Cannot walk normally', 'Cannot walk'],
        required: true
      }
    ]
  },
  // COMPREHENSIVE OUTCOME MEASURES
  {
    id: 'dash',
    name: 'DASH (Disabilities of Arm, Shoulder and Hand)',
    bodyPart: 'upper_extremity',
    category: 'outcome',
    description: 'Standardized outcome measure for upper extremity disabilities. 30-item questionnaire assessing symptoms and functional status.',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'dash_1',
        type: 'scale',
        question: 'During the past week, to what degree has your arm, shoulder or hand problem interfered with your normal social activities with family, friends, neighbours or groups?',
        min: 1,
        max: 5,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'dash_2',
        type: 'scale',
        question: 'During the past week, were you limited in your work or other regular daily activities as a result of your arm, shoulder or hand problem?',
        min: 1,
        max: 5,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'dash_3',
        type: 'scale',
        question: 'Open a tight or new jar',
        min: 1,
        max: 5,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'dash_4',
        type: 'scale',
        question: 'Write',
        min: 1,
        max: 5,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'dash_5',
        type: 'scale',
        question: 'Cut food above the level of your shoulder',
        min: 1,
        max: 5,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'dash_6',
        type: 'scale',
        question: 'Arm, shoulder or hand pain',
        min: 1,
        max: 5,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'dash_7',
        type: 'scale',
        question: 'Tingling (pins and needles) in your arm, shoulder or hand',
        min: 1,
        max: 5,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'dash_8',
        type: 'scale',
        question: 'Weakness in your arm, shoulder or hand',
        min: 1,
        max: 5,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'dash_9',
        type: 'scale',
        question: 'Stiffness in your arm, shoulder or hand',
        min: 1,
        max: 5,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'dash_10',
        type: 'scale',
        question: 'Difficulty sleeping due to arm, shoulder or hand pain',
        min: 1,
        max: 5,
        required: true,
        scoring: { type: 'sum' }
      }
    ]
  },
  {
    id: 'oswestry',
    name: 'Oswestry Disability Index (ODI)',
    bodyPart: 'back',
    category: 'outcome',
    description: 'Gold standard outcome measure for low back pain disability. 10-item questionnaire assessing functional limitations.',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'odi_pain_intensity',
        type: 'select',
        question: 'Pain Intensity',
        options: [
          'I have no pain at the moment',
          'The pain is very mild at the moment',
          'The pain is moderate at the moment',
          'The pain is fairly severe at the moment',
          'The pain is very severe at the moment',
          'The pain is the worst imaginable at the moment'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'odi_personal_care',
        type: 'select',
        question: 'Personal Care (Washing, Dressing, etc.)',
        options: [
          'I can look after myself normally without causing extra pain',
          'I can look after myself normally but it causes extra pain',
          'It is painful to look after myself and I am slow and careful',
          'I need some help but manage most of my personal care',
          'I need help every day in most aspects of self care',
          'I do not get dressed, I wash with difficulty and stay in bed'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'odi_lifting',
        type: 'select',
        question: 'Lifting',
        options: [
          'I can lift heavy weights without extra pain',
          'I can lift heavy weights but it gives extra pain',
          'Pain prevents me from lifting heavy weights off the floor, but I can manage if they are conveniently positioned',
          'Pain prevents me from lifting heavy weights, but I can manage light to medium weights if they are conveniently positioned',
          'I can lift very light weights',
          'I cannot lift or carry anything at all'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'odi_walking',
        type: 'select',
        question: 'Walking',
        options: [
          'Pain does not prevent me walking any distance',
          'Pain prevents me from walking more than 1 mile',
          'Pain prevents me from walking more than 1/2 mile',
          'Pain prevents me from walking more than 100 yards',
          'I can only walk using a stick or crutches',
          'I am in bed most of the time'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'odi_sitting',
        type: 'select',
        question: 'Sitting',
        options: [
          'I can sit in any chair as long as I like',
          'I can only sit in my favourite chair as long as I like',
          'Pain prevents me sitting more than one hour',
          'Pain prevents me from sitting more than 30 minutes',
          'Pain prevents me from sitting more than 10 minutes',
          'Pain prevents me from sitting at all'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'odi_standing',
        type: 'select',
        question: 'Standing',
        options: [
          'I can stand as long as I want without extra pain',
          'I can stand as long as I want but it gives me extra pain',
          'Pain prevents me from standing for more than 1 hour',
          'Pain prevents me from standing for more than 30 minutes',
          'Pain prevents me from standing for more than 10 minutes',
          'Pain prevents me from standing at all'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'odi_sleeping',
        type: 'select',
        question: 'Sleeping',
        options: [
          'My sleep is never disturbed by pain',
          'My sleep is occasionally disturbed by pain',
          'Because of pain I have less than 6 hours sleep',
          'Because of pain I have less than 4 hours sleep',
          'Because of pain I have less than 2 hours sleep',
          'Pain prevents me from sleeping at all'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'odi_sex_life',
        type: 'select',
        question: 'Sex Life (if applicable)',
        options: [
          'My sex life is normal and causes no extra pain',
          'My sex life is normal but causes some extra pain',
          'My sex life is nearly normal but is very painful',
          'My sex life is severely restricted by pain',
          'My sex life is nearly absent because of pain',
          'Pain prevents any sex life at all'
        ],
        required: false,
        scoring: { type: 'weighted' }
      },
      {
        id: 'odi_social_life',
        type: 'select',
        question: 'Social Life',
        options: [
          'My social life is normal and gives me no extra pain',
          'My social life is normal but increases the degree of pain',
          'Pain has no significant effect on my social life apart from limiting my more energetic interests',
          'Pain has restricted my social life and I do not go out as often',
          'Pain has restricted my social life to my home',
          'I have no social life because of pain'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'odi_travelling',
        type: 'select',
        question: 'Travelling',
        options: [
          'I can travel anywhere without pain',
          'I can travel anywhere but it gives me extra pain',
          'Pain is bad but I manage journeys over two hours',
          'Pain restricts me to journeys of less than one hour',
          'Pain restricts me to short necessary journeys under 30 minutes',
          'Pain prevents me from travelling except to receive treatment'
        ],
        required: true,
        scoring: { type: 'weighted' }
      }
    ]
  },
  {
    id: 'womac',
    name: 'WOMAC (Western Ontario and McMaster Universities Osteoarthritis Index)',
    bodyPart: 'hip_knee',
    category: 'outcome',
    description: 'Standardized outcome measure for hip and knee osteoarthritis. Assesses pain, stiffness, and physical function.',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'womac_pain_walking',
        type: 'scale',
        question: 'How much pain do you have walking on flat surface?',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'womac_pain_stairs_up',
        type: 'scale',
        question: 'How much pain do you have going up or down stairs?',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'womac_pain_night',
        type: 'scale',
        question: 'How much pain do you have at night while in bed?',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'womac_pain_sitting',
        type: 'scale',
        question: 'How much pain do you have sitting or lying?',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'womac_pain_standing',
        type: 'scale',
        question: 'How much pain do you have standing upright?',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'womac_stiffness_morning',
        type: 'scale',
        question: 'How severe is your stiffness after first wakening in the morning?',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'womac_stiffness_sitting',
        type: 'scale',
        question: 'How severe is your stiffness after sitting, lying or resting later in the day?',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'womac_function_stairs_down',
        type: 'scale',
        question: 'Descending stairs',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'womac_function_stairs_up',
        type: 'scale',
        question: 'Ascending stairs',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'womac_function_rising_sitting',
        type: 'scale',
        question: 'Rising from sitting',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'womac_function_standing',
        type: 'scale',
        question: 'Standing',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'womac_function_bending',
        type: 'scale',
        question: 'Bending to floor/picking up an object',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'womac_function_walking_flat',
        type: 'scale',
        question: 'Walking on flat surface',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'womac_function_getting_in_out_car',
        type: 'scale',
        question: 'Getting in/out of car',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'womac_function_shopping',
        type: 'scale',
        question: 'Going shopping',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'womac_function_socks',
        type: 'scale',
        question: 'Putting on socks/stockings',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'womac_function_rising_bed',
        type: 'scale',
        question: 'Rising from bed',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      }
    ]
  },
  {
    id: 'ndi',
    name: 'NDI (Neck Disability Index)',
    bodyPart: 'neck',
    category: 'outcome',
    description: 'Standardized outcome measure for neck pain and disability. 10-item questionnaire assessing functional limitations.',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'ndi_pain_intensity',
        type: 'select',
        question: 'Pain Intensity',
        options: [
          'I have no pain at the moment',
          'The pain is very mild at the moment',
          'The pain is moderate at the moment',
          'The pain is fairly severe at the moment',
          'The pain is very severe at the moment',
          'The pain is the worst imaginable'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'ndi_personal_care',
        type: 'select',
        question: 'Personal Care (washing, dressing, etc.)',
        options: [
          'I can look after myself normally without causing extra pain',
          'I can look after myself normally but it causes extra pain',
          'It is painful to look after myself and I am slow and careful',
          'I need some help but manage most of my personal care',
          'I need help every day in most aspects of self care',
          'I do not get dressed, wash with difficulty and stay in bed'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'ndi_lifting',
        type: 'select',
        question: 'Lifting',
        options: [
          'I can lift heavy weights without extra pain',
          'I can lift heavy weights but it gives extra pain',
          'Pain prevents me from lifting heavy weights off the floor',
          'Pain prevents me from lifting heavy weights but I can manage light weights',
          'I can lift very light weights',
          'I cannot lift or carry anything'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'ndi_reading',
        type: 'select',
        question: 'Reading',
        options: [
          'I can read as much as I want to with no pain in my neck',
          'I can read as much as I want with slight pain in my neck',
          'I can read as much as I want with moderate pain in my neck',
          'I cannot read as much as I want because of moderate pain',
          'I cannot read as much as I want because of severe pain',
          'I cannot read at all'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'ndi_headaches',
        type: 'select',
        question: 'Headaches',
        options: [
          'I have no headaches at all',
          'I have slight headaches which come infrequently',
          'I have moderate headaches which come infrequently',
          'I have moderate headaches which come frequently',
          'I have severe headaches which come frequently',
          'I have headaches almost all the time'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'ndi_concentration',
        type: 'select',
        question: 'Concentration',
        options: [
          'I can concentrate fully when I want to with no difficulty',
          'I can concentrate fully when I want to with slight difficulty',
          'I have a fair degree of difficulty in concentrating when I want to',
          'I have a lot of difficulty in concentrating when I want to',
          'I have a great deal of difficulty in concentrating when I want to',
          'I cannot concentrate at all'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'ndi_work',
        type: 'select',
        question: 'Work',
        options: [
          'I can do as much work as I want to',
          'I can only do my usual work but no more',
          'I can do most of my usual work but no more',
          'I cannot do my usual work',
          'I can hardly do any work at all',
          'I cannot do any work at all'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'ndi_driving',
        type: 'select',
        question: 'Driving',
        options: [
          'I can drive my car without any neck pain',
          'I can drive my car as long as I want with slight pain',
          'I can drive my car as long as I want with moderate pain',
          'I cannot drive my car as long as I want because of moderate pain',
          'I can hardly drive at all because of severe pain',
          'I cannot drive my car at all'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'ndi_sleeping',
        type: 'select',
        question: 'Sleeping',
        options: [
          'I have no trouble sleeping',
          'My sleep is slightly disturbed (less than 1 hour sleepless)',
          'My sleep is mildly disturbed (1-2 hours sleepless)',
          'My sleep is moderately disturbed (2-3 hours sleepless)',
          'My sleep is greatly disturbed (3-5 hours sleepless)',
          'My sleep is completely disturbed (5-7 hours sleepless)'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'ndi_recreation',
        type: 'select',
        question: 'Recreation',
        options: [
          'I am able to engage in all recreation activities with no neck pain',
          'I am able to engage in all recreation activities with some neck pain',
          'I am able to engage in most recreation activities because of neck pain',
          'I am able to engage in a few recreation activities because of neck pain',
          'I can hardly do any recreation activities because of neck pain',
          'I cannot do any recreation activities at all'
        ],
        required: true,
        scoring: { type: 'weighted' }
      }
    ]
  },
  {
    id: 'koos',
    name: 'KOOS (Knee Injury and Osteoarthritis Outcome Score)',
    bodyPart: 'knee',
    category: 'outcome',
    description: 'Comprehensive knee-specific outcome measure assessing pain, symptoms, ADL function, sport/recreation, and quality of life.',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'koos_pain_frequency',
        type: 'scale',
        question: 'How often do you experience knee pain?',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'koos_pain_twisting',
        type: 'scale',
        question: 'Twisting/pivoting on your knee',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'koos_pain_straightening',
        type: 'scale',
        question: 'Straightening knee fully',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'koos_pain_bending',
        type: 'scale',
        question: 'Bending knee fully',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'koos_pain_walking_flat',
        type: 'scale',
        question: 'Walking on flat surface',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'koos_pain_stairs',
        type: 'scale',
        question: 'Going up or down stairs',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'koos_pain_night',
        type: 'scale',
        question: 'At night while in bed',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'koos_stiffness_morning',
        type: 'scale',
        question: 'How severe is your knee joint stiffness after first awakening in the morning?',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'koos_stiffness_sitting',
        type: 'scale',
        question: 'How severe is your knee stiffness after sitting, lying or resting later in the day?',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'koos_function_stairs_down',
        type: 'scale',
        question: 'Descending stairs',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'koos_function_stairs_up',
        type: 'scale',
        question: 'Ascending stairs',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'koos_function_rising_sitting',
        type: 'scale',
        question: 'Rising from sitting',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'koos_function_standing',
        type: 'scale',
        question: 'Standing',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'koos_function_bending',
        type: 'scale',
        question: 'Bending to floor/picking up an object',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'koos_sport_squatting',
        type: 'scale',
        question: 'Squatting',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'koos_sport_running',
        type: 'scale',
        question: 'Running',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'koos_sport_jumping',
        type: 'scale',
        question: 'Jumping and landing',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'koos_sport_turning',
        type: 'scale',
        question: 'Turning/twisting on your injured knee',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'koos_qol_aware',
        type: 'scale',
        question: 'How often are you aware of your knee problem?',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'koos_qol_lifestyle',
        type: 'scale',
        question: 'Have you modified your lifestyle to avoid potentially damaging activities to your knee?',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      }
    ]
  },
  {
    id: 'spadi',
    name: 'SPADI (Shoulder Pain and Disability Index)',
    bodyPart: 'shoulder',
    category: 'outcome',
    description: 'Shoulder-specific outcome measure with 13 items assessing pain and disability in shoulder conditions.',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'spadi_pain_worst',
        type: 'scale',
        question: 'At its worst?',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'spadi_pain_lying_affected_side',
        type: 'scale',
        question: 'When lying on the involved side?',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'spadi_pain_reaching_overhead',
        type: 'scale',
        question: 'Reaching for something on a high shelf?',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'spadi_pain_touching_back',
        type: 'scale',
        question: 'Touching the back of your neck?',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'spadi_pain_pushing',
        type: 'scale',
        question: 'Pushing with the involved arm?',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'spadi_disability_washing_hair',
        type: 'scale',
        question: 'Washing your hair?',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'spadi_disability_washing_back',
        type: 'scale',
        question: 'Washing your back?',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'spadi_disability_putting_on_shirt',
        type: 'scale',
        question: 'Putting on an undershirt or pullover sweater?',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'spadi_disability_putting_on_coat',
        type: 'scale',
        question: 'Putting on a shirt that buttons down the front?',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'spadi_disability_placing_object_shelf',
        type: 'scale',
        question: 'Placing an object on a high shelf?',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'spadi_disability_carrying_10_pounds',
        type: 'scale',
        question: 'Carrying a heavy object of 10 pounds?',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'spadi_disability_removing_from_back_pocket',
        type: 'scale',
        question: 'Removing something from your back pocket?',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      }
    ]
  },
  {
    id: 'pem',
    name: 'PEM (Patient Evaluation Measure)',
    bodyPart: 'elbow',
    category: 'outcome',
    description: 'Elbow-specific outcome measure assessing pain, function, and satisfaction.',
    evidenceLevel: 'B',
    questions: [
      {
        id: 'pem_pain_rest',
        type: 'scale',
        question: 'Pain at rest',
        min: 1,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'pem_pain_grip',
        type: 'scale',
        question: 'Pain with gripping',
        min: 1,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'pem_pain_lifting',
        type: 'scale',
        question: 'Pain with lifting',
        min: 1,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'pem_function_dressing',
        type: 'scale',
        question: 'Dressing',
        min: 1,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'pem_function_hygiene',
        type: 'scale',
        question: 'Personal hygiene',
        min: 1,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'pem_function_eating',
        type: 'scale',
        question: 'Eating/cutting food',
        min: 1,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'pem_function_household',
        type: 'scale',
        question: 'Household tasks',
        min: 1,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'pem_function_carrying',
        type: 'scale',
        question: 'Carrying',
        min: 1,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      }
    ]
  },
  {
    id: 'faam',
    name: 'FAAM (Foot and Ankle Ability Measure)',
    bodyPart: 'ankle',
    category: 'outcome',
    description: 'Foot and ankle specific outcome measure assessing activities of daily living and sports activities.',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'faam_standing',
        type: 'scale',
        question: 'Standing',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'faam_walking_even_surfaces',
        type: 'scale',
        question: 'Walking on even ground',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'faam_walking_uneven_ground',
        type: 'scale',
        question: 'Walking on uneven ground',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'faam_walking_hills',
        type: 'scale',
        question: 'Walking up hills',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'faam_walking_stairs',
        type: 'scale',
        question: 'Going up and down stairs',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'faam_walking_curbs',
        type: 'scale',
        question: 'Walking on uneven ground',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'faam_squatting',
        type: 'scale',
        question: 'Squatting',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'faam_coming_up_on_toes',
        type: 'scale',
        question: 'Coming up on your toes',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'faam_walking_initially',
        type: 'scale',
        question: 'Walking initially',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'faam_walking_5_minutes',
        type: 'scale',
        question: 'Walking 5 minutes or less',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'faam_walking_10_minutes',
        type: 'scale',
        question: 'Walking approximately 10 minutes',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'faam_walking_15_minutes',
        type: 'scale',
        question: 'Walking 15 minutes or greater',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'faam_home_responsibilities',
        type: 'scale',
        question: 'Home responsibilities',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'faam_activities_daily_living',
        type: 'scale',
        question: 'Activities of daily living',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'faam_personal_care',
        type: 'scale',
        question: 'Personal care responsibilities',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'faam_light_to_moderate_work',
        type: 'scale',
        question: 'Light to moderate work (standing, walking)',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'faam_heavy_work',
        type: 'scale',
        question: 'Heavy work (pushing, pulling, climbing, carrying)',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'faam_recreational_activities',
        type: 'scale',
        question: 'Recreational activities',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      }
    ]
  },
  {
    id: 'rolq',
    name: 'ROLQ (Roland Morris Low Back Pain and Disability Questionnaire)',
    bodyPart: 'back',
    category: 'outcome',
    description: 'Functional disability questionnaire for low back pain. 24-item yes/no questionnaire.',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'rolq_1',
        type: 'checkbox',
        question: 'I stay at home most of the time because of my back',
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'rolq_2',
        type: 'checkbox',
        question: 'I change position frequently to try and get my back comfortable',
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'rolq_3',
        type: 'checkbox',
        question: 'I walk more slowly than usual because of my back',
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'rolq_4',
        type: 'checkbox',
        question: 'Because of my back I am not doing any of the jobs that I usually do around the house',
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'rolq_5',
        type: 'checkbox',
        question: 'Because of my back, I use a handrail to get upstairs',
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'rolq_6',
        type: 'checkbox',
        question: 'Because of my back, I lie down to rest more often',
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'rolq_7',
        type: 'checkbox',
        question: 'Because of my back, I have to hold on to something to get out of an easy chair',
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'rolq_8',
        type: 'checkbox',
        question: 'Because of my back, I try to get other people to do things for me',
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'rolq_9',
        type: 'checkbox',
        question: 'I get dressed more slowly than usual because of my back',
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'rolq_10',
        type: 'checkbox',
        question: 'I only stand for short periods of time because of my back',
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'rolq_11',
        type: 'checkbox',
        question: 'Because of my back, I try not to bend or kneel down',
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'rolq_12',
        type: 'checkbox',
        question: 'I find it difficult to get out of a chair because of my back',
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'rolq_13',
        type: 'checkbox',
        question: 'My back is painful almost all the time',
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'rolq_14',
        type: 'checkbox',
        question: 'I find it difficult to turn over in bed because of my back',
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'rolq_15',
        type: 'checkbox',
        question: 'My appetite is not very good because of my back pain',
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'rolq_16',
        type: 'checkbox',
        question: 'I have trouble putting on my socks (or stockings) because of the pain in my back',
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'rolq_17',
        type: 'checkbox',
        question: 'I only walk short distances because of my back pain',
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'rolq_18',
        type: 'checkbox',
        question: 'I sleep less well because of my back',
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'rolq_19',
        type: 'checkbox',
        question: 'Because of my back pain, I get dressed with help from someone else',
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'rolq_20',
        type: 'checkbox',
        question: 'I sit down for most of the day because of my back',
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'rolq_21',
        type: 'checkbox',
        question: 'I avoid heavy jobs around the house because of my back',
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'rolq_22',
        type: 'checkbox',
        question: 'Because of my back pain, I am more irritable and bad tempered with people than usual',
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'rolq_23',
        type: 'checkbox',
        question: 'Because of my back, I go upstairs more slowly than usual',
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'rolq_24',
        type: 'checkbox',
        question: 'I stay in bed most of the time because of my back',
        required: true,
        scoring: { type: 'sum' }
      }
    ]
  },
  {
    id: 'harris_hip_score',
    name: 'Harris Hip Score',
    bodyPart: 'hip',
    category: 'outcome',
    description: 'Standardized outcome measure for hip function and pain assessment. Widely used in hip replacement and hip pathology.',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'harris_pain',
        type: 'select',
        question: 'Pain',
        options: [
          'None or ignores it (44 points)',
          'Slight, occasional, no compromise in activities (40 points)',
          'Mild pain, no effect on average activities, rarely moderate pain with unusual activity (30 points)',
          'Moderate pain, tolerable but makes concessions to pain (20 points)',
          'Marked pain, serious limitation of activities (10 points)',
          'Totally disabled, crippled, pain in bed, bedridden (0 points)'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'harris_limp',
        type: 'select',
        question: 'Limp',
        options: [
          'None (11 points)',
          'Slight (8 points)',
          'Moderate (5 points)',
          'Severe (0 points)'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'harris_support',
        type: 'select',
        question: 'Support',
        options: [
          'None (11 points)',
          'Cane for long walks (7 points)',
          'Cane most of time (5 points)',
          'One crutch (3 points)',
          'Two canes (2 points)',
          'Two crutches (0 points)',
          'Not able to walk (0 points)'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'harris_distance_walked',
        type: 'select',
        question: 'Distance walked',
        options: [
          'Unlimited (11 points)',
          'Six blocks (8 points)',
          'Two or three blocks (5 points)',
          'Indoors only (2 points)',
          'Bed and chair (0 points)'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'harris_stairs',
        type: 'select',
        question: 'Stairs',
        options: [
          'Normally without using a railing (4 points)',
          'Normally using a railing (2 points)',
          'In any manner (1 point)',
          'Unable to do stairs (0 points)'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'harris_shoes_socks',
        type: 'select',
        question: 'Put on shoes and socks',
        options: [
          'With ease (4 points)',
          'With difficulty (2 points)',
          'Unable (0 points)'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'harris_sitting',
        type: 'select',
        question: 'Sitting',
        options: [
          'Comfortably in ordinary chair for one hour (5 points)',
          'On a high chair for 30 minutes (3 points)',
          'Unable to sit comfortably in any chair (0 points)'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'harris_enter_public_transport',
        type: 'select',
        question: 'Enter public transportation',
        options: [
          'Yes (1 point)',
          'No (0 points)'
        ],
        required: true,
        scoring: { type: 'weighted' }
      }
    ]
  },
  {
    id: 'constant_murley',
    name: 'Constant-Murley Shoulder Score',
    bodyPart: 'shoulder',
    category: 'outcome',
    description: 'Comprehensive shoulder assessment combining subjective and objective measures including pain, ADL, ROM and strength.',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'constant_pain',
        type: 'scale',
        question: 'Pain (15 points maximum)',
        min: 0,
        max: 15,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'constant_adl_work',
        type: 'scale',
        question: 'Activity level - Work (4 points maximum)',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'constant_adl_recreation',
        type: 'scale',
        question: 'Activity level - Recreation/Sport (4 points maximum)',
        min: 0,
        max: 4,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'constant_adl_sleep',
        type: 'scale',
        question: 'Activity level - Sleep (2 points maximum)',
        min: 0,
        max: 2,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'constant_positioning',
        type: 'select',
        question: 'Positioning - Up to waist',
        options: [
          '2 points',
          '0 points'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'constant_positioning_xiphoid',
        type: 'select',
        question: 'Positioning - Up to xiphoid',
        options: [
          '4 points',
          '0 points'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'constant_positioning_neck',
        type: 'select',
        question: 'Positioning - Up to neck',
        options: [
          '6 points',
          '0 points'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'constant_positioning_top_head',
        type: 'select',
        question: 'Positioning - Top of head',
        options: [
          '8 points',
          '0 points'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'constant_positioning_above_head',
        type: 'select',
        question: 'Positioning - Above head',
        options: [
          '10 points',
          '0 points'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'constant_forward_flexion',
        type: 'number',
        question: 'Range of Motion - Forward Flexion (degrees)',
        min: 0,
        max: 180,
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'constant_lateral_elevation',
        type: 'number',
        question: 'Range of Motion - Lateral Elevation (degrees)',
        min: 0,
        max: 180,
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'constant_external_rotation',
        type: 'number',
        question: 'Range of Motion - External Rotation (degrees)',
        min: 0,
        max: 90,
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'constant_internal_rotation',
        type: 'select',
        question: 'Range of Motion - Internal Rotation',
        options: [
          'Hand behind back - lateral thigh (0 points)',
          'Hand behind back - buttock (2 points)',
          'Hand behind back - lumbosacral junction (4 points)',
          'Hand behind back - waist (L3) (6 points)',
          'Hand behind back - T12 vertebra (8 points)',
          'Hand behind back - interscapular (T7) (10 points)'
        ],
        required: true,
        scoring: { type: 'weighted' }
      },
      {
        id: 'constant_strength',
        type: 'number',
        question: 'Strength (pounds of pull) - Maximum 25 points',
        min: 0,
        max: 25,
        required: true,
        scoring: { type: 'sum' }
      }
    ]
  },
  {
    id: 'prwe',
    name: 'PRWE (Patient-Rated Wrist Evaluation)',
    bodyPart: 'wrist',
    category: 'outcome',
    description: 'Wrist-specific outcome measure assessing pain and functional disability in wrist disorders.',
    evidenceLevel: 'A',
    questions: [
      {
        id: 'prwe_pain_rest',
        type: 'scale',
        question: 'Rate the average amount of pain in your wrist during the past week when you were at rest',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'prwe_pain_holding',
        type: 'scale',
        question: 'Rate the average amount of pain in your wrist during the past week when you were doing a task with repeated wrist motions',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'prwe_pain_carrying',
        type: 'scale',
        question: 'Rate the average amount of pain in your wrist during the past week when you were carrying a heavy object (over 10 pounds)',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'prwe_pain_worst',
        type: 'scale',
        question: 'Rate your worst amount of pain during the past week',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'prwe_pain_frequency',
        type: 'scale',
        question: 'How often did you have pain during the past week?',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'prwe_specific_turning_doorknob',
        type: 'scale',
        question: 'Turn a door knob',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'prwe_specific_cutting_food',
        type: 'scale',
        question: 'Cut food using a knife in affected hand',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'prwe_specific_fastening_buttons',
        type: 'scale',
        question: 'Fasten buttons on clothing',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'prwe_specific_use_bathroom_tissue',
        type: 'scale',
        question: 'Use bathroom tissue',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'prwe_specific_wash_dishes',
        type: 'scale',
        question: 'Wash dishes',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'prwe_usual_personal_care',
        type: 'scale',
        question: 'Personal care activities (dress, wash, brush teeth)',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'prwe_usual_household_work',
        type: 'scale',
        question: 'Household work (cleaning, laundry, yard work)',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'prwe_usual_work',
        type: 'scale',
        question: 'Work (your job or usual everyday work)',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'prwe_usual_recreational',
        type: 'scale',
        question: 'Recreational activities',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      },
      {
        id: 'prwe_usual_social',
        type: 'scale',
        question: 'Social activities',
        min: 0,
        max: 10,
        required: true,
        scoring: { type: 'sum' }
      }
    ]
  }
];

interface AssessmentTemplatesProps {
  onSelectTemplate: (template: AssessmentTemplate) => void;
  selectedBodyPart?: string;
}

export default function AssessmentTemplates({ onSelectTemplate, selectedBodyPart }: AssessmentTemplatesProps) {
  const [activeTab, setActiveTab] = useState('screening');
  const [redFlagResults, setRedFlagResults] = useState<{ [key: string]: boolean }>({});
  const [showRedFlags, setShowRedFlags] = useState(false);

  const filteredTemplates = assessmentTemplates.filter(template => 
    template.category === activeTab && 
    (!selectedBodyPart || template.bodyPart === selectedBodyPart || template.bodyPart === 'general')
  );

  const handleRedFlagChange = (flagId: string, checked: boolean) => {
    setRedFlagResults(prev => ({ ...prev, [flagId]: checked }));
  };

  const getRedFlagSeverity = () => {
    const positiveFlags = Object.entries(redFlagResults)
      .filter(([_, isPositive]) => isPositive)
      .map(([flagId]) => redFlags.find(flag => flag.id === flagId)!)
      .filter(Boolean);

    if (positiveFlags.some(flag => flag.severity === 'high')) return 'high';
    if (positiveFlags.some(flag => flag.severity === 'moderate')) return 'moderate';
    return 'low';
  };

  const getEvidenceBadgeColor = (level: string) => {
    switch (level) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-yellow-100 text-yellow-800';
      case 'C': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Clinical Assessment Templates</h2>
        <p className="text-muted-foreground">
          Select a structured assessment template to guide your clinical evaluation
        </p>
      </div>
      
      {/* Red Flag Screening */}
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-800">Red Flag Screening</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRedFlags(!showRedFlags)}
            >
              {showRedFlags ? 'Hide' : 'Show'} Screening
            </Button>
          </div>
        </CardHeader>
        {showRedFlags && (
          <CardContent className="space-y-4">
            {redFlags.map((flag) => (
              <div key={flag.id} className="flex items-start space-x-3">
                <Checkbox
                  id={flag.id}
                  checked={redFlagResults[flag.id] || false}
                  onCheckedChange={(checked) => handleRedFlagChange(flag.id, !!checked)}
                />
                <div className="flex-1">
                  <Label htmlFor={flag.id} className="text-sm font-medium">
                    {flag.question}
                  </Label>
                  {redFlagResults[flag.id] && (
                    <div className={`mt-2 p-2 rounded text-sm ${
                      flag.severity === 'high' ? 'bg-red-50 text-red-800' :
                      flag.severity === 'moderate' ? 'bg-yellow-50 text-yellow-800' :
                      'bg-blue-50 text-blue-800'
                    }`}>
                      <strong>Action Required:</strong> {flag.action}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {Object.values(redFlagResults).some(Boolean) && (
              <div className={`p-4 rounded-lg ${
                getRedFlagSeverity() === 'high' ? 'bg-red-50 border border-red-200' :
                getRedFlagSeverity() === 'moderate' ? 'bg-yellow-50 border border-yellow-200' :
                'bg-green-50 border border-green-200'
              }`}>
                <div className="flex items-center gap-2">
                  {getRedFlagSeverity() === 'high' ? (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  <span className="font-medium">
                    {getRedFlagSeverity() === 'high' ? 'Immediate Action Required' :
                     getRedFlagSeverity() === 'moderate' ? 'Medical Consultation Recommended' :
                     'Continue with Assessment'}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Assessment Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Clinical Assessment Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="screening">Screening</TabsTrigger>
              <TabsTrigger value="assessment">Assessment</TabsTrigger>
              <TabsTrigger value="outcome">Outcome Measures</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              <div className="grid gap-4 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{template.name}</h3>
                            <Badge className={getEvidenceBadgeColor(template.evidenceLevel)}>
                              Level {template.evidenceLevel}
                            </Badge>
                            <Badge variant="outline">
                              {template.bodyPart.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {template.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{template.questions.length} questions</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              ~{Math.ceil(template.questions.length * 0.5)} min
                            </span>
                          </div>
                        </div>
                        <Button
                          onClick={() => onSelectTemplate(template)}
                          size="sm"
                        >
                          Start Assessment
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredTemplates.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No {activeTab} templates available for the selected body region.
                    {selectedBodyPart && (
                      <div className="mt-2">
                        <Button
                          variant="link"
                          onClick={() => window.location.reload()}
                          className="text-sm"
                        >
                          View all templates
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export { type AssessmentTemplate, type AssessmentQuestion, assessmentTemplates };