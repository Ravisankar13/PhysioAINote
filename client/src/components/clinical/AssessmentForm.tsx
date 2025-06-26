import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, ArrowLeft, ArrowRight, Calculator } from 'lucide-react';
import { AssessmentTemplate, AssessmentQuestion } from './AssessmentTemplates';

interface AssessmentFormProps {
  template: AssessmentTemplate;
  onComplete: (results: AssessmentResults) => void;
  onBack: () => void;
}

interface AssessmentResults {
  templateId: string;
  templateName: string;
  responses: { [questionId: string]: any };
  score?: number;
  interpretation?: string;
  recommendations?: string[];
  timestamp: Date;
}

export default function AssessmentForm({ template, onComplete, onBack }: AssessmentFormProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<{ [questionId: string]: any }>({});
  const [showResults, setShowResults] = useState(false);

  const currentQuestion = template.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / template.questions.length) * 100;

  const handleResponse = (questionId: string, value: any) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const canProceed = () => {
    if (!currentQuestion.required) return true;
    const response = responses[currentQuestion.id];
    return response !== undefined && response !== '' && response !== null;
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < template.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      calculateResults();
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const calculateResults = () => {
    const results: AssessmentResults = {
      templateId: template.id,
      templateName: template.name,
      responses,
      timestamp: new Date()
    };

    // Calculate scores based on template type
    if (template.id === 'dash') {
      const scoreValues = Object.values(responses).map((val: any): number => {
        switch (val) {
          case 'No difficulty': return 1;
          case 'Mild difficulty': return 2;
          case 'Moderate difficulty': return 3;
          case 'Severe difficulty': return 4;
          case 'Unable': return 5;
          default: return 0;
        }
      });
      const totalScore = scoreValues.reduce((sum: number, val: number) => sum + val, 0);
      const dashScore = ((totalScore - template.questions.length) / (template.questions.length * 4)) * 100;
      results.score = Math.round(dashScore);
      results.interpretation = getDashInterpretation(dashScore);
      results.recommendations = getDashRecommendations(dashScore);
    }

    if (template.id === 'shoulder_impingement') {
      const positiveTests = Object.values(responses).filter(val => val === 'Positive').length;
      results.score = positiveTests;
      results.interpretation = getShoulderImpingementInterpretation(positiveTests);
      results.recommendations = getShoulderImpingementRecommendations(positiveTests);
    }

    if (template.id === 'low_back_stm') {
      const positiveResponses = Object.values(responses).filter(val => val === true).length;
      results.score = positiveResponses;
      results.interpretation = getSTarTBackInterpretation(positiveResponses);
      results.recommendations = getSTarTBackRecommendations(positiveResponses);
    }

    setShowResults(true);
    onComplete(results);
  };

  const getDashInterpretation = (score: number): string => {
    if (score <= 25) return 'Mild disability - Patient experiences some difficulty with daily activities';
    if (score <= 50) return 'Moderate disability - Significant impact on daily function';
    if (score <= 75) return 'Severe disability - Major functional limitations';
    return 'Extreme disability - Unable to perform most daily activities';
  };

  const getDashRecommendations = (score: number): string[] => {
    const recommendations = ['Monitor progress with regular reassessment'];
    if (score > 50) {
      recommendations.push('Consider referral to occupational therapy');
      recommendations.push('Implement activity modification strategies');
    }
    if (score > 75) {
      recommendations.push('Comprehensive multidisciplinary approach');
      recommendations.push('Consider workplace ergonomic assessment');
    }
    return recommendations;
  };

  const getShoulderImpingementInterpretation = (positiveTests: number): string => {
    if (positiveTests === 0) return 'Negative screen - Impingement syndrome unlikely';
    if (positiveTests <= 2) return 'Possible impingement - Consider differential diagnosis';
    return 'Positive screen - High likelihood of impingement syndrome';
  };

  const getShoulderImpingementRecommendations = (positiveTests: number): string[] => {
    const recommendations = ['Continue with comprehensive shoulder assessment'];
    if (positiveTests > 0) {
      recommendations.push('Assess scapular stability and posture');
      recommendations.push('Consider rotator cuff strengthening program');
    }
    if (positiveTests >= 3) {
      recommendations.push('Implement impingement-specific treatment protocol');
      recommendations.push('Consider imaging if conservative treatment fails');
    }
    return recommendations;
  };

  const getSTarTBackInterpretation = (score: number): string => {
    if (score <= 3) return 'Low risk - Suitable for self-management approach';
    if (score <= 6) return 'Medium risk - Consider physiotherapy intervention';
    return 'High risk - Requires comprehensive biopsychosocial approach';
  };

  const getSTarTBackRecommendations = (score: number): string[] => {
    if (score <= 3) {
      return [
        'Provide education about back pain',
        'Encourage early return to normal activities',
        'Simple advice on activity modification'
      ];
    }
    if (score <= 6) {
      return [
        'Structured physiotherapy program',
        'Manual therapy if appropriate',
        'Graduated exercise program',
        'Monitor for psychosocial factors'
      ];
    }
    return [
      'Comprehensive biopsychosocial assessment',
      'Address fear avoidance behaviors',
      'Consider cognitive behavioral approaches',
      'Multidisciplinary team approach'
    ];
  };

  const getJoGibsonShoulderInterpretation = (responses: { [key: string]: any }): string => {
    const interpretations = [];
    
    // Extract key findings
    const torn = responses['is_it_torn'];
    const stiff = responses['is_it_stiff'];
    const irritable = responses['is_it_irritable'];
    const changeable = responses['can_you_change_it'];
    
    if (torn) interpretations.push(`Structure: ${torn}`);
    if (stiff) interpretations.push(`Mobility: ${stiff}`);
    if (irritable) interpretations.push(`Irritability: ${irritable}`);
    if (changeable) interpretations.push(`Modifiability: ${changeable}`);
    
    return interpretations.join(' | ');
  };

  const getJoGibsonShoulderRecommendations = (responses: { [key: string]: any }): string[] => {
    const recommendations = [];
    
    // Base recommendations on key responses
    if (responses['is_it_irritable'] === 'Highly irritable') {
      recommendations.push('Rest and gentle range of motion only');
      recommendations.push('Pain management strategies');
    } else if (responses['is_it_irritable'] === 'Moderately irritable') {
      recommendations.push('Conservative approach within pain-free range');
      recommendations.push('Gentle progressive loading');
    } else {
      recommendations.push('Normal loading progression appropriate');
    }
    
    if (responses['is_it_stiff'] !== 'Normal ROM') {
      recommendations.push('Progressive mobilization program');
      recommendations.push('Range of motion exercises');
    }
    
    if (responses['can_you_change_it'] === 'Highly modifiable') {
      recommendations.push('Excellent prognosis - aggressive treatment appropriate');
    } else if (responses['can_you_change_it'] === 'Not modifiable') {
      recommendations.push('Consider alternative treatments or specialist referral');
    }
    
    return recommendations;
  };

  const getGrimaldiHipInterpretation = (responses: { [key: string]: any }): string => {
    const interpretations = [];
    
    const painLocation = responses['lateral_hip_pain_location'];
    const strength = responses['gluteal_strength_test'];
    const loading = responses['tendon_loading_response'];
    
    if (painLocation) interpretations.push(`Pain: ${painLocation}`);
    if (strength) interpretations.push(`Strength: ${strength}`);
    if (loading) interpretations.push(`Loading response: ${loading}`);
    
    return interpretations.join(' | ');
  };

  const getGrimaldiHipRecommendations = (responses: { [key: string]: any }): string[] => {
    const recommendations = [];
    
    if (responses['lateral_hip_pain_location'] === 'Greater trochanter') {
      recommendations.push('Focus on gluteal tendinopathy management');
      recommendations.push('Progressive loading program for gluteal tendons');
    }
    
    if (responses['gluteal_strength_test'] !== 'Normal strength') {
      recommendations.push('Gluteal strengthening program');
      recommendations.push('Motor control training');
    }
    
    if (responses['tendon_loading_response'] === 'Improves with loading') {
      recommendations.push('Continue progressive loading - excellent prognosis');
    } else if (responses['tendon_loading_response'] === 'Worsens immediately') {
      recommendations.push('Reduce loading intensity initially');
      recommendations.push('Focus on pain management before strengthening');
    }
    
    if (responses['itb_tightness'] !== 'Normal') {
      recommendations.push('ITB/TFL stretching program');
    }
    
    return recommendations;
  };

  const getMcKenzieLowerBackInterpretation = (responses: { [key: string]: any }): string => {
    const interpretations = [];
    
    const centralization = responses['centralization_phenomenon'];
    const extensionResponse = responses['extension_response'];
    const flexionResponse = responses['flexion_response'];
    
    if (centralization) interpretations.push(`Centralization: ${centralization}`);
    if (extensionResponse) interpretations.push(`Extension: ${extensionResponse}`);
    if (flexionResponse) interpretations.push(`Flexion: ${flexionResponse}`);
    
    return interpretations.join(' | ');
  };

  const getMcKenzieLowerBackRecommendations = (responses: { [key: string]: any }): string[] => {
    const recommendations = [];
    
    if (responses['centralization_phenomenon'] === 'Yes, easily') {
      recommendations.push('Excellent prognosis - rapid recovery expected');
      recommendations.push('Continue with directional preference exercises');
    } else if (responses['centralization_phenomenon'] === 'No centralization') {
      recommendations.push('Consider alternative approaches');
      recommendations.push('May require different treatment strategy');
    }
    
    if (responses['extension_response'] === 'Pain centralizes') {
      recommendations.push('Extension exercises are indicated');
      recommendations.push('Avoid flexion-based activities initially');
    } else if (responses['flexion_response'] === 'Pain centralizes') {
      recommendations.push('Flexion exercises may be beneficial');
    }
    
    if (responses['lateral_shift'] !== 'No shift') {
      recommendations.push('Address lateral shift correction first');
      recommendations.push('Lateral glide mobilizations indicated');
    }
    
    if (responses['sitting_tolerance'] === 'Cannot sit' || responses['sitting_tolerance'] === 'Moderate discomfort') {
      recommendations.push('Minimize sitting time initially');
      recommendations.push('Focus on extension-based approach');
    }
    
    return recommendations;
  };

  const getBissetElbowInterpretation = (responses: { [key: string]: any }): string => {
    const interpretations = [];
    
    const painLocation = responses['elbow_pain_location'];
    const palpation = responses['lateral_epicondyle_palpation'];
    const strength = responses['wrist_extension_strength'];
    const millsTest = responses['mills_test'];
    
    if (painLocation) interpretations.push(`Pain location: ${painLocation}`);
    if (palpation) interpretations.push(`Palpation: ${palpation}`);
    if (strength) interpretations.push(`Strength: ${strength}`);
    if (millsTest) interpretations.push(`Mills test: ${millsTest}`);
    
    return interpretations.join(' | ');
  };

  const getBissetElbowRecommendations = (responses: { [key: string]: any }): string[] => {
    const recommendations = [];
    
    if (responses['elbow_pain_location'] === 'Lateral epicondyle') {
      recommendations.push('Likely lateral epicondylitis - focus on extensor tendon management');
      recommendations.push('Progressive loading program for extensor tendons');
    }
    
    if (responses['lateral_epicondyle_palpation'] !== 'Non-tender') {
      recommendations.push('Pain management strategies for acute inflammation');
      recommendations.push('Avoid aggravating activities initially');
    }
    
    if (responses['wrist_extension_strength'] !== 'Full strength') {
      recommendations.push('Gradual strengthening of wrist extensors');
      recommendations.push('Eccentric strengthening exercises');
    }
    
    if (responses['mills_test'] === 'Positive - reproduces symptoms') {
      recommendations.push('Confirms extensor tendon involvement');
      recommendations.push('Focus on tendon loading tolerance');
    }
    
    if (responses['grip_strength_pain']) {
      recommendations.push('Modify gripping activities');
      recommendations.push('Use ergonomic tools to reduce grip strain');
    }
    
    return recommendations;
  };

  const getRobertsonKneeInterpretation = (responses: { [key: string]: any }): string => {
    const interpretations = [];
    
    const painLocation = responses['knee_pain_location'];
    const tracking = responses['patella_tracking'];
    const apprehension = responses['patella_apprehension'];
    const compression = responses['patella_compression'];
    
    if (painLocation) interpretations.push(`Pain: ${painLocation}`);
    if (tracking) interpretations.push(`Tracking: ${tracking}`);
    if (apprehension) interpretations.push(`Apprehension: ${apprehension}`);
    if (compression) interpretations.push(`Compression: ${compression}`);
    
    return interpretations.join(' | ');
  };

  const getRobertsonKneeRecommendations = (responses: { [key: string]: any }): string[] => {
    const recommendations = [];
    
    if (responses['knee_pain_location'] === 'Anterior knee/patella') {
      recommendations.push('Likely patellofemoral pain syndrome');
      recommendations.push('Focus on patella tracking and VMO strengthening');
    }
    
    if (responses['patella_tracking'] !== 'Normal tracking') {
      recommendations.push('Patella tracking dysfunction present');
      recommendations.push('VMO strengthening and patellar taping');
    }
    
    if (responses['patella_apprehension'] !== 'Negative') {
      recommendations.push('Patella instability concerns');
      recommendations.push('Focus on quadriceps strengthening and proprioception');
    }
    
    if (responses['patella_compression'] !== 'Negative') {
      recommendations.push('Patellofemoral joint irritation');
      recommendations.push('Activity modification and pain management');
    }
    
    if (responses['knee_quadriceps_strength'] !== 'Full strength') {
      recommendations.push('Quadriceps strengthening program essential');
      recommendations.push('Focus on VMO activation exercises');
    }
    
    if (responses['knee_swelling'] !== 'None visible') {
      recommendations.push('Address inflammation and swelling');
      recommendations.push('RICE protocol and anti-inflammatory measures');
    }
    
    return recommendations;
  };

  const getMayerAnkleInterpretation = (responses: { [key: string]: any }): string => {
    const interpretations = [];
    
    const painLocation = responses['ankle_pain_location'];
    const mechanism = responses['ankle_mechanism_injury'];
    const stability = responses['ankle_stability'];
    const weightBearing = responses['ankle_weight_bearing'];
    
    if (painLocation) interpretations.push(`Pain: ${painLocation}`);
    if (mechanism) interpretations.push(`Mechanism: ${mechanism}`);
    if (stability) interpretations.push(`Stability: ${stability}`);
    if (weightBearing) interpretations.push(`Weight-bearing: ${weightBearing}`);
    
    return interpretations.join(' | ');
  };

  const getMayerAnkleRecommendations = (responses: { [key: string]: any }): string[] => {
    const recommendations = [];
    
    if (responses['ankle_pain_location'] === 'Lateral ankle') {
      recommendations.push('Likely lateral ankle sprain');
      recommendations.push('Focus on lateral ligament rehabilitation');
    } else if (responses['ankle_pain_location'] === 'Achilles region') {
      recommendations.push('Achilles tendon involvement');
      recommendations.push('Progressive loading program for Achilles');
    }
    
    if (responses['ankle_mechanism_injury'] === 'Inversion sprain') {
      recommendations.push('Inversion injury pattern - focus on lateral structures');
      recommendations.push('Proprioception and balance training essential');
    }
    
    if (responses['ankle_stability'] !== 'Stable/negative') {
      recommendations.push('Ankle instability present');
      recommendations.push('Comprehensive stability and proprioception program');
    }
    
    if (responses['ankle_weight_bearing'] !== 'Full weight-bearing') {
      recommendations.push('Progressive weight-bearing program');
      recommendations.push('Address pain and swelling first');
    }
    
    if (responses['ankle_swelling'] !== 'None') {
      recommendations.push('Control swelling with elevation and compression');
      recommendations.push('Ice therapy and anti-inflammatory measures');
    }
    
    if (responses['ankle_dorsiflexion_rom'] !== 'Normal (>10 degrees)') {
      recommendations.push('Address ankle dorsiflexion limitation');
      recommendations.push('Calf stretching and joint mobilization');
    }
    
    if (responses['ankle_plantarflexion_strength'] !== 'Normal strength') {
      recommendations.push('Calf strengthening program');
      recommendations.push('Progressive loading from partial to full weight-bearing');
    }
    
    return recommendations;
  };

  const getRunningInjuryInterpretation = (responses: { [key: string]: any }): string => {
    const interpretations = [];
    
    const injuryLocation = responses['injury_location'];
    const painOnset = responses['pain_onset'];
    const trainingChanges = responses['training_changes'];
    const painIntensity = responses['pain_intensity'];
    
    if (injuryLocation) interpretations.push(`Primary injury: ${injuryLocation}`);
    if (painOnset) interpretations.push(`Onset: ${painOnset}`);
    if (trainingChanges && trainingChanges !== 'No recent changes') interpretations.push(`Training factor: ${trainingChanges}`);
    if (painIntensity) interpretations.push(`Pain level: ${painIntensity}/10`);
    
    return interpretations.join(' | ');
  };

  const getRunningInjuryRecommendations = (responses: { [key: string]: any }): string[] => {
    const recommendations = [];
    
    // Injury-specific recommendations
    if (responses['injury_location'] === 'Knee') {
      recommendations.push('Likely patellofemoral pain or IT band syndrome');
      recommendations.push('Focus on hip strengthening and gait modification');
    } else if (responses['injury_location'] === 'Shin/Tibia') {
      recommendations.push('Possible medial tibial stress syndrome');
      recommendations.push('Address training load and running surface');
    } else if (responses['injury_location'] === 'Achilles tendon') {
      recommendations.push('Achilles tendinopathy management required');
      recommendations.push('Progressive loading program essential');
    } else if (responses['injury_location'] === 'Plantar fascia/Heel') {
      recommendations.push('Plantar fasciitis protocol indicated');
      recommendations.push('Calf stretching and foot strengthening');
    } else if (responses['injury_location'] === 'IT Band') {
      recommendations.push('IT band syndrome - focus on hip abductor strength');
      recommendations.push('Foam rolling and stretching program');
    }
    
    // Training-related recommendations
    if (responses['training_changes'] === 'Increased mileage suddenly') {
      recommendations.push('Reduce weekly mileage by 20-30% immediately');
      recommendations.push('Follow 10% weekly increase rule for progression');
    } else if (responses['training_changes'] === 'Increased speed/intensity') {
      recommendations.push('Reduce intensity training temporarily');
      recommendations.push('Focus on base building before speed work');
    }
    
    // Equipment and surface recommendations
    if (responses['shoe_age'] === 'Over 1 year' || responses['shoe_age'] === '6-12 months') {
      recommendations.push('Consider replacing running shoes');
      recommendations.push('Shoes typically need replacement every 300-500 miles');
    }
    
    if (responses['running_surface'] === 'Concrete/Pavement') {
      recommendations.push('Consider softer running surfaces when possible');
      recommendations.push('Mix in trail or track running');
    }
    
    // Strength and conditioning recommendations
    if (responses['strength_training'] === 'Never' || responses['strength_training'] === 'Occasionally') {
      recommendations.push('Implement regular strength training program');
      recommendations.push('Focus on hip, core, and lower leg strengthening');
    }
    
    if (responses['warmup_routine'] === 'Never' || responses['warmup_routine'] === 'Rarely') {
      recommendations.push('Establish consistent warm-up routine');
      recommendations.push('Include dynamic stretching and activation exercises');
    }
    
    // Functional test-based recommendations
    if (responses['hip_drop_test'] !== 'Stable - no hip drop') {
      recommendations.push('Hip stability weakness identified');
      recommendations.push('Single leg strengthening and balance training');
    }
    
    if (responses['calf_raise_test'] !== 'Completed easily') {
      recommendations.push('Calf strength deficiency noted');
      recommendations.push('Progressive calf strengthening program');
    }
    
    if (responses['hop_test'] !== 'No pain or difficulty') {
      recommendations.push('Functional loading tolerance compromised');
      recommendations.push('Progressive return to impact activities');
    }
    
    // Pain intensity-based recommendations
    const painLevel = responses['pain_intensity'];
    if (painLevel >= 7) {
      recommendations.push('High pain level - consider rest from running');
      recommendations.push('Focus on pain management and gentle rehabilitation');
    } else if (painLevel >= 4) {
      recommendations.push('Moderate pain - reduce running volume significantly');
      recommendations.push('Cross-training with low-impact activities');
    } else if (painLevel > 0) {
      recommendations.push('Mild pain - monitor closely and modify as needed');
      recommendations.push('Implement prevention strategies');
    }
    
    return recommendations;
  };

  const renderQuestion = (question: AssessmentQuestion) => {
    const response = responses[question.id];

    switch (question.type) {
      case 'text':
        return (
          <Textarea
            value={response || ''}
            onChange={(e) => handleResponse(question.id, e.target.value)}
            placeholder="Enter your response..."
            rows={3}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={response || ''}
            onChange={(e) => handleResponse(question.id, parseInt(e.target.value) || '')}
            placeholder="Enter number..."
          />
        );

      case 'select':
        return (
          <Select value={response || ''} onValueChange={(value) => handleResponse(question.id, value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={question.id}
              checked={response || false}
              onCheckedChange={(checked) => handleResponse(question.id, checked)}
            />
            <Label htmlFor={question.id}>Yes</Label>
          </div>
        );

      case 'scale':
        const min = question.min || 0;
        const max = question.max || 10;
        const scaleValues = Array.from({ length: max - min + 1 }, (_, i) => min + i);
        return (
          <RadioGroup value={response?.toString() || ''} onValueChange={(value) => handleResponse(question.id, parseInt(value))}>
            <div className="flex flex-wrap gap-4">
              {scaleValues.map((num) => (
                <div key={num} className="flex items-center space-x-2">
                  <RadioGroupItem value={num.toString()} id={`${question.id}-${num}`} />
                  <Label htmlFor={`${question.id}-${num}`}>{num}</Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        );

      default:
        return null;
    }
  };

  if (showResults) {
    const results: AssessmentResults = {
      templateId: template.id,
      templateName: template.name,
      responses,
      timestamp: new Date()
    };

    // Calculate results based on template
    if (template.id === 'jo_gibson_shoulder') {
      results.interpretation = getJoGibsonShoulderInterpretation(responses);
      results.recommendations = getJoGibsonShoulderRecommendations(responses);
    } else if (template.id === 'alison_grimaldi_hip') {
      results.interpretation = getGrimaldiHipInterpretation(responses);
      results.recommendations = getGrimaldiHipRecommendations(responses);
    } else if (template.id === 'mckenzie_lower_back') {
      results.interpretation = getMcKenzieLowerBackInterpretation(responses);
      results.recommendations = getMcKenzieLowerBackRecommendations(responses);
    } else if (template.id === 'bisset_elbow') {
      results.interpretation = getBissetElbowInterpretation(responses);
      results.recommendations = getBissetElbowRecommendations(responses);
    } else if (template.id === 'robertson_knee') {
      results.interpretation = getRobertsonKneeInterpretation(responses);
      results.recommendations = getRobertsonKneeRecommendations(responses);
    } else if (template.id === 'mayer_ankle') {
      results.interpretation = getMayerAnkleInterpretation(responses);
      results.recommendations = getMayerAnkleRecommendations(responses);
    } else if (template.id === 'running_injury_assessment') {
      results.interpretation = getRunningInjuryInterpretation(responses);
      results.recommendations = getRunningInjuryRecommendations(responses);
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Assessment Complete: {template.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="space-y-4">
            {results.interpretation && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Clinical Interpretation</h3>
                <p className="text-blue-800">{results.interpretation}</p>
              </div>
            )}

            {results.recommendations && results.recommendations.length > 0 && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Treatment Recommendations</h3>
                <ul className="list-disc list-inside space-y-1 text-green-800">
                  {results.recommendations.map((recommendation, index) => (
                    <li key={index}>{recommendation}</li>
                  ))}
                </ul>
              </div>
            )}

            {results.score !== undefined && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold text-yellow-900 mb-2">Assessment Score</h3>
                <p className="text-yellow-800">Score: {results.score}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t mt-6">
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Templates
            </Button>
            <Button onClick={() => onComplete(results)}>
              Save Results
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{template.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Question {currentQuestionIndex + 1} of {template.questions.length}
            </p>
          </div>
          <Badge className="bg-green-100 text-green-800">
            Level {template.evidenceLevel}
          </Badge>
        </div>
        <Progress value={progress} className="w-full" />
      </CardHeader>

      <CardContent className="flex flex-col space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-start gap-2">
            {currentQuestion.required && (
              <AlertCircle className="h-4 w-4 text-red-500 mt-1 flex-shrink-0" />
            )}
            <div className="flex-1">
              <Label className="text-base font-medium">
                {currentQuestion.question}
                {currentQuestion.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
            </div>
          </div>

          <div className="ml-6">
            {renderQuestion(currentQuestion)}
          </div>
        </div>

        <div className="flex justify-between">
          <Button
            onClick={onBack}
            variant="outline"
            disabled={currentQuestionIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentQuestionIndex === 0 ? 'Back to Templates' : 'Previous'}
          </Button>

          <div className="flex gap-2">
            {currentQuestionIndex > 0 && (
              <Button onClick={prevQuestion} variant="outline">
                Previous Question
              </Button>
            )}
            <Button
              onClick={nextQuestion}
              disabled={!canProceed()}
            >
              {currentQuestionIndex === template.questions.length - 1 ? (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate Results
                </>
              ) : (
                <>
                  Next Question
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { type AssessmentResults };